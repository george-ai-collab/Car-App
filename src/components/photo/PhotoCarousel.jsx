import { useState } from "react";
import { T } from "../../theme";

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
    setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
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
            {mode === "feed" && <div aria-hidden style={{ position: "absolute", inset: -40, background: `url(${p.url}) center/cover`, filter: "blur(28px) brightness(0.55)" }} />}
            <img src={p.url} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
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
