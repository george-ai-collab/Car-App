import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { T } from "../../theme";
import { tr } from "../../lib/i18n";

// Sound for videos is one setting for the whole app (off until you turn it on, like TikTok/Instagram).
let soundOn = false;
const soundListeners = new Set();
const setSound = (on) => { soundOn = on; soundListeners.forEach((fn) => fn(on)); };

// A video in a post: plays by itself while it's on screen (paused otherwise), loops, tap the
// speaker for sound.
export function PostVideo({ item, mode }) {
  const ref = useRef(null);
  const [sound, setSoundState] = useState(soundOn);
  const [paused, setPaused] = useState(false);
  useEffect(() => { soundListeners.add(setSoundState); return () => soundListeners.delete(setSoundState); }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio > 0.6) v.play().then(() => setPaused(false)).catch(() => setPaused(true));
      else v.pause();
    }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (ref.current) ref.current.muted = !sound; }, [sound]);
  return (
    <>
      {mode === "feed" && item.poster && <div aria-hidden style={{ position: "absolute", inset: -40, background: `url(${item.poster}) center/cover`, filter: "blur(28px) brightness(0.5)" }} />}
      <video ref={ref} data-testid="post-video" src={item.url} poster={item.poster || undefined} muted={!sound} loop playsInline preload="metadata"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      {paused && (
        <button aria-label={tr("Play")} onClick={() => ref.current?.play().then(() => setPaused(false)).catch(() => {})} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 64, height: 64, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          <Play size={28} color="#fff" fill="#fff" />
        </button>
      )}
      <button aria-label={sound ? tr("Mute") : tr("Turn sound on")} data-testid="video-sound" onClick={(e) => { e.stopPropagation(); setSound(!sound); }}
        style={{ position: "absolute", left: 12, top: mode === "feed" ? 76 : 10, zIndex: 3, width: 36, height: 36, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {sound ? <Volume2 size={17} color="#fff" /> : <VolumeX size={17} color="#fff" />}
      </button>
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
