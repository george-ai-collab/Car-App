import { tr } from "./i18n";
// Videos: read one, trim it to at most 60 seconds, and shrink it on the phone before upload
// (720p, ~1.6 Mbit/s, so a full minute is ~12 MB instead of 100+ MB). Original sound is kept.
export const MAX_SECONDS = 60;
const MAX_SIDE = 1280;

export function readVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata"; v.muted = true; v.playsInline = true; v.src = url;
    v.onloadedmetadata = () => {
      // some phones report Infinity until the end is reached; nudge it
      if (!Number.isFinite(v.duration)) { v.currentTime = 1e7; v.ontimeupdate = () => { v.ontimeupdate = null; resolve({ url, duration: v.duration, w: v.videoWidth, h: v.videoHeight }); }; return; }
      resolve({ url, duration: v.duration, w: v.videoWidth, h: v.videoHeight });
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error(tr("Couldn't read that video"))); };
  });
}

const pickType = () => {
  const options = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return options.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
};

const seek = (v, t) => new Promise((res) => { v.onseeked = () => { v.onseeked = null; res(); }; v.currentTime = t; });

// Plays the chosen part once (quietly) while recording it at a smaller size.
// Returns { blob, type, poster (jpeg data URL), aspect, duration }.
export async function processVideo(url, start, end, { muted = false, onProgress, signal } = {}) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error(tr("This phone can't prepare videos"));
  const v = document.createElement("video");
  v.src = url; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error(tr("Couldn't read that video"))); });
  const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
  const w = Math.round((v.videoWidth * scale) / 2) * 2, h = Math.round((v.videoHeight * scale) / 2) * 2;
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d");
  await seek(v, start);
  g.drawImage(v, 0, 0, w, h);
  const poster = canvas.toDataURL("image/jpeg", 0.8);

  const stream = canvas.captureStream(30);
  let audioCtx = null;
  if (!muted) {
    try {
      // Route the sound into the recording only (not the speaker), so preparing is silent.
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaElementSource(v);
      const dest = audioCtx.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      await audioCtx.resume().catch(() => {});
    } catch { /* no sound track: video only */ }
  } else v.muted = true;

  const type = pickType();
  const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 1_600_000, audioBitsPerSecond: 96_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const finished = new Promise((res) => { rec.onstop = res; });

  let stopped = false;
  const stop = () => {
    if (stopped) return; stopped = true;
    v.pause();
    try { rec.stop(); } catch { /* already */ }
  };
  const draw = () => {
    if (stopped) return;
    g.drawImage(v, 0, 0, w, h);
    const t = v.currentTime;
    onProgress?.(Math.min(1, Math.max(0, (t - start) / Math.max(0.1, end - start))));
    if (t >= end || v.ended) { stop(); return; }
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(draw); else requestAnimationFrame(draw);
  };
  signal?.addEventListener?.("abort", stop);
  v.onended = stop;
  rec.start(500);
  await v.play();
  draw();
  await finished;
  audioCtx?.close?.().catch(() => {});
  if (signal?.aborted) throw new Error("cancelled");
  const blob = new Blob(chunks, { type: (type || "video/webm").split(";")[0] });
  return { blob, type: blob.type, poster, aspect: w / h, duration: Math.round((end - start) * 10) / 10 };
}

export const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
