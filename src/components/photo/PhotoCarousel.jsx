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
export function PostVideo({ item, mode, active = true }) {
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
    if (!active) { v.pause(); return; }
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio > 0.6) v.play().catch(() => setPaused(true));
      else v.pause();
    }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, [active]);
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
        style={{ position: "absolute", left: 0, right: 0, bottom: mode === "feed" ? "calc(72px + var(--inset-bottom))" : 0, height: 22, zIndex: 5, touchAction: "none", display: "flex", alignItems: "flex-end", cursor: "pointer" }}>
        <div style={{ position: "relative", width: "100%", height: scrub ? 6 : 3, background: "rgba(255,255,255,0.28)", transition: "height .15s ease" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "#fff" }} />
          {scrub && <div style={{ position: "absolute", left: `${pct}%`, top: "50%", width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: 99, background: "#fff" }} />}
        </div>
        {scrub && dur > 0 && (
          <div data-testid="video-time" style={{ position: "absolute", left: "50%", bottom: mode === "feed" ? 150 : 40, transform: "translateX(-50%)", color: "#fff", fontSize: 20, fontWeight: 800, whiteSpace: "nowrap", pointerEvents: "none", ...onDark, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
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

const clampAspect = (a) => Math.min(1.91, Math.max(0.8, a || 1));
const EASE = "cubic-bezier(.2,.8,.2,1)";

// A deck of photos (and short clips). Your finger moves the top one directly — no scroll snapping,
// which stuttered on Android — and the next one waits underneath, growing and brightening into place.
// Each photo keeps its own shape: the post gently resizes as you move between them.
export function PhotoCarousel({ photos, mode = "feed" }) {
  const [i, setI] = useState(0);
  const N = photos.length, many = N > 1;
  const wrap = useRef(null);
  const nodes = useRef([]), shades = useRef([]);
  const g = useRef(null);
  const posRef = useRef(0);
  const swiped = useRef(false);
  const [W, setW] = useState(0);
  const rtl = () => !!wrap.current && getComputedStyle(wrap.current).direction === "rtl";

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = "ResizeObserver" in window ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // Place every slide for a (possibly in-between) position. Only transform/opacity: cheap to draw.
  const layout = (pos, animate) => {
    const w = Math.max(1, wrap.current?.clientWidth || W || 1);
    const dir = rtl() ? 1 : -1;
    const tr = animate ? `transform .34s ${EASE}` : "none", op = animate ? `opacity .34s ${EASE}` : "none";
    nodes.current.forEach((n, k) => {
      if (!n) return;
      const d = k - pos, sh = shades.current[k];
      let t = "", o = 0, vis = "visible";
      if (d <= -1) { t = `translate3d(${dir * w}px,0,0)`; vis = "hidden"; }
      else if (d < 0) t = `translate3d(${-d * dir * w}px,0,0)`;
      else if (d <= 1) { t = `scale(${1 - 0.07 * d})`; o = 0.5 * d; }
      else { t = "scale(0.93)"; o = 0.5; vis = d > 2 ? "hidden" : "visible"; }
      n.style.transition = tr; n.style.transform = t; n.style.visibility = vis;
      if (sh) { sh.style.transition = op; sh.style.opacity = String(o); }
    });
    posRef.current = pos;
  };
  useEffect(() => { layout(i, false); }, [N, W]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (k) => { const n = Math.max(0, Math.min(N - 1, k)); layout(n, true); setI(n); };
  const down = (e) => {
    if (!many || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (e.target.closest?.("[data-notap], button")) return;
    g.current = { x: e.clientX, y: e.clientY, t: performance.now(), axis: null, id: e.pointerId, lastX: e.clientX, lastT: performance.now(), v: 0 };
    swiped.current = false;
  };
  const move = (e) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (s.axis === "y") { g.current = null; return; }
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    const now = performance.now();
    s.v = (e.clientX - s.lastX) / Math.max(1, now - s.lastT); s.lastX = e.clientX; s.lastT = now;
    const w = Math.max(1, wrap.current.clientWidth);
    let pos = i - (rtl() ? -dx : dx) / w;
    if (pos < 0) pos *= 0.3; else if (pos > N - 1) pos = N - 1 + (pos - (N - 1)) * 0.3; // a little give at the ends
    layout(pos, false);
  };
  const up = (e) => {
    const s = g.current; g.current = null;
    if (!s || s.axis !== "x") return;
    swiped.current = true;
    const w = Math.max(1, wrap.current.clientWidth);
    const dx = e.clientX - s.x, fwd = rtl() ? dx > 0 : dx < 0;
    const fast = Math.abs(s.v) > 0.45 && Math.abs(dx) > 12;
    go(Math.abs(dx) > w * 0.2 || fast ? i + (fwd ? 1 : -1) : i);
  };
  const cancel = () => { if (g.current?.axis === "x") go(i); g.current = null; };
  // A swipe shouldn't also count as a tap (e.g. pausing a video).
  const clickCapture = (e) => { if (swiped.current) { swiped.current = false; e.stopPropagation(); e.preventDefault(); } };

  // The box takes the current photo's shape (kept between 4:5 tall and 1.91:1 wide).
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const aspect = clampAspect(photos[i]?.aspect);
  const h = W ? Math.min(W / aspect, vh * (mode === "detail" ? 0.75 : 0.78)) : undefined;
  const box = mode === "feed"
    ? { position: "absolute", inset: 0 }
    : { position: "relative", width: "100%", ...(h ? { height: h } : { aspectRatio: String(aspect) }), overflow: "hidden", background: "#000", borderRadius: mode === "detail" ? 18 : 0, transition: `height .34s ${EASE}` };
  const dotsBottom = mode === "feed" ? "calc(76px + var(--inset-bottom))" : photos[i]?.type === "video" ? 26 : 10;

  // isolation: the counter and dots stay inside this post, so menus and sheets cover them.
  const deck = (
    <div ref={wrap} style={{ ...box, isolation: "isolate" }}>
      <div data-testid="carousel" data-index={i} {...(many ? { "data-noswipe": true } : {})}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onClickCapture={clickCapture}
        style={{ position: "absolute", inset: 0, touchAction: many ? "pan-y" : "auto", overflow: "hidden" }}>
        {photos.map((p, k) => (
          <div key={k} data-slide={k} ref={(n) => { nodes.current[k] = n; }}
            style={{ position: "absolute", inset: 0, zIndex: N - k, overflow: "hidden", willChange: many ? "transform" : undefined, transformOrigin: "50% 50%", background: "#000", visibility: k > i + 2 || k < i ? "hidden" : "visible" }}>
            {p.type === "video" ? <PostVideo item={p} mode={mode} active={k === i} /> : (
              <>
                {mode === "feed" && <div aria-hidden style={{ position: "absolute", inset: -40, background: `url(${p.url}) center/cover`, filter: "blur(28px) brightness(0.55)" }} />}
                <img src={p.url} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: mode !== "feed" && p.aspect && Math.abs(clampAspect(p.aspect) - p.aspect) < 0.02 ? "cover" : "contain" }} />
              </>
            )}
            {many && <div aria-hidden ref={(n) => { shades.current[k] = n; }} style={{ position: "absolute", inset: 0, background: "#000", opacity: 0, pointerEvents: "none", zIndex: 6 }} />}
          </div>
        ))}
      </div>
      {many && (
        <>
          <div data-testid="photo-count" style={{ position: "absolute", top: mode === "feed" ? "calc(72px + var(--inset-top))" : 10, right: 12, zIndex: 50, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, pointerEvents: "none" }}>
            {i + 1}/{N}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: dotsBottom, zIndex: 50, display: "flex", justifyContent: "center", gap: 5, pointerEvents: "none" }}>
            {photos.map((_, k) => <span key={k} style={{ width: k === i ? 16 : 6, height: 6, borderRadius: 99, background: k === i ? T.accent : "rgba(255,255,255,0.55)", transition: "width .2s ease, background .2s ease" }} />)}
          </div>
        </>
      )}
    </div>
  );
  if (mode !== "detail" || !many) return deck;
  // On a post's page the deck shows its edges: the next items peek out above the top one.
  // The space is always kept (so nothing below jumps); the edges just fade as you reach the end.
  const left = N - 1 - i;
  return (
    <div data-testid="photo-stack" style={{ position: "relative", paddingTop: 14 }}>
      {[2, 1].map((n) => {
        const nx = photos[i + n];
        return (
          <div key={n} aria-hidden style={{ position: "absolute", top: (2 - n) * 7, left: `${n * 4}%`, right: `${n * 4}%`, height: 40, borderRadius: 18,
            background: nx ? (nx.type === "video" ? (nx.poster ? `url(${nx.poster}) center/cover` : T.surface2) : `url(${nx.url}) center/cover`) : T.surface2,
            opacity: n <= left ? 1 : 0, filter: `brightness(${0.55 - n * 0.12})`, transition: "opacity .3s ease" }} />
        );
      })}
      <div style={{ position: "relative" }}>{deck}</div>
    </div>
  );
}
