import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Volume2, VolumeX, Scissors } from "lucide-react";
import { T } from "../../theme";
import { MAX_SECONDS, fmtSecs } from "../../lib/video";
import { tr } from "../../lib/i18n";

// Trim a video: drag the two handles (or the whole window) to pick up to 60 seconds.
// The preview loops the chosen part.
export function VideoTrim({ video, setVideo, onBack, onNext }) {
  const vref = useRef(null);
  const bar = useRef(null);
  const drag = useRef(null);
  const [playhead, setPlayhead] = useState(video.start);
  const { duration, start, end } = video;
  const tooLong = duration > MAX_SECONDS;

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const onTime = () => {
      setPlayhead(v.currentTime);
      if (v.currentTime >= end || v.currentTime < start - 0.3) { v.currentTime = start; v.play().catch(() => {}); }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [start, end]);
  useEffect(() => { if (vref.current) { vref.current.currentTime = start; vref.current.play().catch(() => {}); } }, [start]);

  const pct = (t) => `${(t / duration) * 100}%`;
  const timeAt = (clientX) => {
    const r = bar.current.getBoundingClientRect();
    return Math.min(duration, Math.max(0, ((clientX - r.left) / r.width) * duration));
  };
  const down = (which) => (e) => {
    e.preventDefault(); e.stopPropagation();
    drag.current = { which, x0: e.clientX, s0: start, e0: end };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const t = timeAt(e.clientX);
    let s = start, en = end;
    if (d.which === "start") { s = Math.min(t, en - 1); if (en - s > MAX_SECONDS) s = en - MAX_SECONDS; }
    else if (d.which === "end") { en = Math.max(t, s + 1); if (en - s > MAX_SECONDS) en = s + MAX_SECONDS; }
    else {
      const len = d.e0 - d.s0;
      const dt = ((e.clientX - d.x0) / bar.current.getBoundingClientRect().width) * duration;
      s = Math.min(Math.max(0, d.s0 + dt), duration - len); en = s + len;
    }
    setVideo({ ...video, start: Math.round(s * 10) / 10, end: Math.round(en * 10) / 10 });
  };
  const up = () => { drag.current = null; };
  const handle = (side) => ({
    position: "absolute", top: -4, bottom: -4, width: 22, marginLeft: -11, left: pct(side === "start" ? start : end),
    display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none", cursor: "ew-resize", zIndex: 2,
  });

  return (
    <div data-testid="video-trim">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button aria-label={tr("Back")} onClick={onBack} className="press" style={{ background: "rgba(255,255,255,0.08)", border: "none", padding: 8, borderRadius: 999, display: "flex" }}><ChevronLeft size={22} color={T.text} /></button>
        <div style={{ flex: 1, color: T.text, fontSize: 17, fontWeight: 800 }}>{tr("Trim video")}</div>
        <button data-testid="video-next" onClick={onNext} className="press" style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 14 }}>{tr("Next")}</button>
      </div>
      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "#000", aspectRatio: String(Math.max(0.56, Math.min(1.78, video.w / video.h || 1))), maxHeight: "55vh", margin: "0 auto" }}>
        <video ref={vref} src={video.url} playsInline muted={video.muted} loop={false} autoPlay style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        <button aria-label={video.muted ? tr("Turn sound on") : tr("Mute")} data-testid="video-mute" onClick={() => setVideo({ ...video, muted: !video.muted })} className="press" style={{ position: "absolute", right: 10, bottom: 10, width: 40, height: 40, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {video.muted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 2px 8px" }}>
        <span style={{ color: T.text, fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Scissors size={14} color={T.accent} /> <span data-testid="trim-length">{fmtSecs(end - start)}</span> {tr("selected")}</span>
        <span style={{ color: tooLong ? "#F2C76A" : T.textDim, fontSize: 12 }}>{tooLong ? tr("Video is {0} · max {1}", fmtSecs(duration), fmtSecs(MAX_SECONDS)) : tr("Up to {0}", fmtSecs(MAX_SECONDS))}</span>
      </div>
      <div ref={bar} data-testid="trim-bar" data-noswipe onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: "relative", height: 48, borderRadius: 12, background: "repeating-linear-gradient(90deg, #26262b 0 18px, #1f1f23 18px 36px)", touchAction: "none", userSelect: "none" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: pct(start), background: "rgba(0,0,0,0.55)", borderRadius: "12px 0 0 12px" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: pct(end), right: 0, background: "rgba(0,0,0,0.55)", borderRadius: "0 12px 12px 0" }} />
        <div data-testid="trim-window" onPointerDown={down("move")} style={{ position: "absolute", top: 0, bottom: 0, left: pct(start), width: `calc(${pct(end)} - ${pct(start)})`, border: `3px solid ${T.accent}`, borderRadius: 10, cursor: "grab", touchAction: "none" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: "#fff", left: pct(playhead), pointerEvents: "none" }} />
        <div data-testid="trim-start" onPointerDown={down("start")} style={handle("start")}><div style={{ width: 8, height: 30, borderRadius: 4, background: "#fff" }} /></div>
        <div data-testid="trim-end" onPointerDown={down("end")} style={handle("end")}><div style={{ width: 8, height: 30, borderRadius: 4, background: "#fff" }} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: T.textDim, fontSize: 11.5, marginTop: 6 }}>
        <span>{fmtSecs(start)}</span><span>{fmtSecs(end)}</span>
      </div>
      <div style={{ color: T.textDim, fontSize: 12, marginTop: 12, lineHeight: 1.45 }}>
        {tr("Drag the handles to choose the part to post, or drag the red box to move it. Original sound is kept unless you mute it.")}
      </div>
    </div>
  );
}
