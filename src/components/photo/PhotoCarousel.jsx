import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { T } from "../../theme";
import { tr } from "../../lib/i18n";

// Sound and speed for videos are one setting for the whole app (sound starts off, like TikTok/Instagram).
const video = { sound: false, speed: 1 };
const listeners = new Set();
const setVideoSetting = (k, v) => { video[k] = v; listeners.forEach((fn) => fn({ ...video })); };
export const SPEEDS = [1, 1.5, 2];
export function useVideoSettings() {
  const [st, setSt] = useState({ ...video });
  useEffect(() => { listeners.add(setSt); return () => listeners.delete(setSt); }, []);
  return {
    ...st,
    toggleSound: () => setVideoSetting("sound", !video.sound),
    nextSpeed: () => setVideoSetting("speed", SPEEDS[(SPEEDS.indexOf(video.speed) + 1) % SPEEDS.length]),
  };
}
const fmt = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, "0")}`;

// Sound on/off and speed (1x, 1.5x, 2x) buttons. The feed puts them in the right-hand column;
// a post's own page shows them on the video.
export function VideoButtons({ style, column }) {
  const v = useVideoSettings();
  const b = { width: 40, height: 40, borderRadius: 999, border: "none", background: column ? "transparent" : "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 0 };
  return (
    <div style={{ display: "flex", flexDirection: column ? "column" : "row", alignItems: "center", gap: column ? 10 : 8, ...style }}>
      <button aria-label={v.sound ? tr("Mute") : tr("Turn sound on")} data-testid="video-sound" onClick={(e) => { e.stopPropagation(); v.toggleSound(); }} className="press" style={b}>
        {v.sound ? <Volume2 size={column ? 26 : 18} color="#fff" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} /> : <VolumeX size={column ? 26 : 18} color="#fff" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />}
      </button>
      <button aria-label={tr("Playback speed")} data-testid="video-speed" onClick={(e) => { e.stopPropagation(); v.nextSpeed(); }} className="press"
        style={{ ...b, fontSize: 13.5, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.6)", ...(column ? { border: "1.5px solid rgba(255,255,255,0.85)", width: 36, height: 26, borderRadius: 8, fontSize: 12 } : {}) }}>
        {v.speed}x
      </button>
    </div>
  );
}

// A video in a post: plays by itself while it's on screen (paused otherwise) and loops.
// Tap to pause or play. Drag the bar at the bottom to go back or forward.
export function PostVideo({ item, mode }) {
  const ref = useRef(null);
  const barRef = useRef(null);
  const { sound, speed } = useVideoSettings();
  const [paused, setPaused] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(item.duration || 0);
  const [scrub, setScrub] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio > 0.6) v.play().catch(() => setPaused(true));
      else v.pause();
    }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (ref.current) ref.current.muted = !sound; }, [sound]);
  useEffect(() => { if (ref.current) ref.current.playbackRate = speed; }, [speed]);
  // Smooth progress while playing.
  useEffect(() => {
    let raf;
    const tick = () => { const v = ref.current; if (v) setT(v.currentTime); raf = requestAnimationFrame(tick); };
    if (!paused) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);
  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const seekTo = (clientX) => {
    const v = ref.current, r = barRef.current?.getBoundingClientRect();
    if (!v || !r || !dur) return;
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    v.currentTime = x * dur; setT(x * dur);
  };
  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;
  const onDark = { filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" };
  return (
    <>
      {mode === "feed" && item.poster && <div aria-hidden style={{ position: "absolute", inset: -40, background: `url(${item.poster}) center/cover`, filter: "blur(28px) brightness(0.5)" }} />}
      <video ref={ref} data-testid="post-video" src={item.url} poster={item.poster || undefined} muted={!sound} loop playsInline preload="metadata"
        onPlay={() => setPaused(false)} onPause={() => setPaused(true)}
        onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setDur(e.currentTarget.duration); e.currentTarget.playbackRate = speed; }}
        // The feed handles taps itself (so a double-tap can still like the post); elsewhere a tap pauses.
        onClick={mode === "feed" ? undefined : toggle}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      {paused && (
        <button aria-label={tr("Play")} data-testid="video-play" onClick={(e) => { e.stopPropagation(); ref.current?.play().catch(() => {}); }} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 68, height: 68, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4 }}>
          <Play size={30} color="#fff" fill="#fff" style={{ marginInlineStart: 3 }} />
        </button>
      )}
      {mode !== "feed" && <VideoButtons style={{ position: "absolute", right: 10, bottom: 18, zIndex: 4 }} />}
      {/* Progress bar: drag along it to rewind or skip ahead. Thicker while you drag, with the time. */}
      <div ref={barRef} data-testid="video-bar" data-noswipe data-notap dir="ltr"
        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); setScrub(true); seekTo(e.clientX); }}
        onPointerMove={(e) => { if (scrub) seekTo(e.clientX); }}
        onPointerUp={() => setScrub(false)} onPointerCancel={() => setScrub(false)}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 22, zIndex: 5, touchAction: "none", display: "flex", alignItems: "flex-end", cursor: "pointer" }}>
        <div style={{ position: "relative", width: "100%", height: scrub ? 6 : 3, background: "rgba(255,255,255,0.28)", transition: "height .15s ease" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "#fff" }} />
          {scrub && <div style={{ position: "absolute", left: `${pct}%`, top: "50%", width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: 99, background: "#fff" }} />}
        </div>
        {scrub && dur > 0 && (
          <div data-testid="video-time" style={{ position: "absolute", left: "50%", bottom: mode === "feed" ? 130 : 40, transform: "translateX(-50%)", color: "#fff", fontSize: 20, fontWeight: 800, whiteSpace: "nowrap", pointerEvents: "none", ...onDark, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
            {fmt(t)} / {fmt(dur)}
          </div>
        )}
      </div>
    </>
  );
}

// Swipe sideways through a post's photos, with dots underneath (like Instagram).
// mode "feed": fills the screen, blurred fill behind each photo. mode "detail": a box in the photo's shape.
export function postPhotos(post) {
  if (post.photos && post.photos.length) return post.photos;
  return post.photoUrl ? [{ url: post.photoUrl, aspect: post.photoAspect }] : [];
}

export function PhotoCarousel({ photos, mode = "feed" }) {
  const [i, setI] = useState(0);
  const many = photos.length > 1;
  const onScroll = (e) => {
    const el = e.currentTarget;
    setI(Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth))); // abs: scrollLeft is negative right-to-left
  };
  const box = mode === "feed"
    ? { position: "absolute", inset: 0 }
    : { position: "relative", width: "100%", aspectRatio: photos[0]?.aspect ? String(photos[0].aspect) : "1", maxHeight: "75vh", borderRadius: 18, overflow: "hidden", background: "#000" };

  return (
    <div style={box}>
      <div data-testid="carousel" {...(many ? { "data-noswipe": true } : {})} onScroll={onScroll} style={{
        // Sideways swipes stay here (next photo); up/down swipes must reach the feed, from anywhere
        // on the photo. (Containing both directions made only the caption area scroll the feed.)
        position: "absolute", inset: 0, display: "flex", overflowX: many ? "auto" : "hidden", overflowY: "hidden",
        scrollSnapType: "x mandatory", overscrollBehaviorX: "contain", overscrollBehaviorY: "auto", touchAction: "pan-x pan-y",
      }}>
        {photos.map((p, k) => (
          <div key={k} style={{ position: "relative", flex: "0 0 100%", height: "100%", scrollSnapAlign: "center", overflow: "hidden" }}>
            {p.type === "video" ? <PostVideo item={p} mode={mode} /> : (
              <>
                {mode === "feed" && <div aria-hidden style={{ position: "absolute", inset: -40, background: `url(${p.url}) center/cover`, filter: "blur(28px) brightness(0.55)" }} />}
                <img src={p.url} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
              </>
            )}
          </div>
        ))}
      </div>
      {many && (
        <>
          <div data-testid="photo-count" style={{ position: "absolute", top: mode === "feed" ? 76 : 10, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, pointerEvents: "none" }}>
            {i + 1}/{photos.length}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: mode === "feed" ? 8 : 10, display: "flex", justifyContent: "center", gap: 5, pointerEvents: "none" }}>
            {photos.map((_, k) => <span key={k} style={{ width: k === i ? 16 : 6, height: 6, borderRadius: 99, background: k === i ? T.accent : "rgba(255,255,255,0.55)", transition: "width .2s ease" }} />)}
          </div>
        </>
      )}
    </div>
  );
}
