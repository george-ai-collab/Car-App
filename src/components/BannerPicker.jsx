// Profile banner: pick a photo, then drag (and zoom) it inside a 3:1 frame. Whatever falls
// outside the frame is dimmed and labelled, so you can see exactly what will be cut off.
import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Move, ZoomIn } from "lucide-react";
import { T } from "../theme";
import { tr } from "../lib/i18n";
import { readPhoto } from "./photo/CameraCapture";
import { BottomSheet } from "./ui";

export const BANNER_ASPECT = 3;          // width : height
const OUT_W = 1500, OUT_H = OUT_W / BANNER_ASPECT;

export function BannerPicker({ onPick, label }) {
  const file = useRef(null);
  const [src, setSrc] = useState(null);
  const choose = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { const r = await readPhoto(f, 2400, 0.9); setSrc(r.src); } catch { /* not an image */ }
  };
  return (
    <>
      <input ref={file} type="file" accept="image/*" hidden onChange={choose} data-testid="banner-input" />
      <button data-testid="banner-pick" onClick={() => file.current?.click()} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "rgba(212,67,77,0.14)", color: T.accent, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        <ImageIcon size={13} /> {label || tr("Change banner")}
      </button>
      <BannerCropper src={src} onCancel={() => setSrc(null)} onDone={(out) => { setSrc(null); onPick(out); }} />
    </>
  );
}

export function BannerCropper({ src, onCancel, onDone }) {
  const frame = useRef(null);
  const [img, setImg] = useState(null);      // { w, h }
  const [box, setBox] = useState({ W: 340, H: 270 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    if (!src) { setImg(null); return; }
    const i = new Image();
    i.onload = () => { setImg({ w: i.naturalWidth, h: i.naturalHeight, el: i }); setZoom(1); setOff({ x: 0, y: 0 }); };
    i.src = src;
  }, [src]);
  useEffect(() => {
    if (!src || !frame.current) return;
    const W = frame.current.clientWidth;
    setBox({ W, H: Math.round(W * 0.8) });
  }, [src, img]);

  if (!src) return null;
  const { W, H } = box;
  const winH = W / BANNER_ASPECT, winTop = (H - winH) / 2;
  // Scale so the photo always covers the 3:1 window, then zoom in from there.
  const base = img ? Math.max(W / img.w, winH / img.h) : 1;
  const sc = base * zoom;
  const iw = img ? img.w * sc : W, ih = img ? img.h * sc : winH;
  const clamp = (o) => ({
    x: Math.min((iw - W) / 2, Math.max(-(iw - W) / 2, o.x)),
    y: Math.min((ih - winH) / 2, Math.max(-(ih - winH) / 2, o.y)),
  });
  const o = clamp(off);
  const left = (W - iw) / 2 + o.x, top = winTop + (winH - ih) / 2 + o.y;

  const down = (e) => { drag.current = { x: e.clientX, y: e.clientY, o }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { const d = drag.current; if (!d) return; setOff(clamp({ x: d.o.x + e.clientX - d.x, y: d.o.y + e.clientY - d.y })); };
  const up = () => { drag.current = null; };

  const save = () => {
    if (!img) return;
    const c = document.createElement("canvas");
    c.width = OUT_W; c.height = OUT_H;
    // The part of the photo inside the window, in the photo's own pixels.
    const sx = (0 - left) / sc, sy = (winTop - top) / sc, sw = W / sc, sh = winH / sc;
    c.getContext("2d").drawImage(img.el, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
    onDone(c.toDataURL("image/jpeg", 0.85));
  };
  const shade = { position: "absolute", left: 0, right: 0, background: "rgba(8,9,11,0.72)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.8)", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", pointerEvents: "none" };

  return (
    <BottomSheet open onClose={onCancel} title={tr("Position your banner")} maxHeight="92vh">
      <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Move size={13} /> {tr("Drag to move it. The dark parts won't show on your profile.")}</div>
      <div ref={frame} data-testid="banner-cropper" data-noswipe onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: "relative", width: "100%", height: H, overflow: "hidden", borderRadius: 16, background: "#000", touchAction: "none", cursor: "grab" }}>
        {img && <img src={src} alt="" draggable={false} style={{ position: "absolute", left, top, width: iw, height: ih, maxWidth: "none", userSelect: "none" }} />}
        <div data-testid="banner-cut-top" style={{ ...shade, top: 0, height: winTop }}>{winTop > 26 && tr("Cut off")}</div>
        <div data-testid="banner-cut-bottom" style={{ ...shade, top: winTop + winH, height: H - winTop - winH }}>{H - winTop - winH > 26 && tr("Cut off")}</div>
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: winTop, height: winH, border: "2px solid rgba(255,255,255,0.9)", borderRadius: 4, boxShadow: "0 0 0 1px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
          {[1, 2].map((k) => <span key={"v" + k} style={{ position: "absolute", top: 0, bottom: 0, left: `${(k * 100) / 3}%`, width: 1, background: "rgba(255,255,255,0.25)" }} />)}
          {[1, 2].map((k) => <span key={"h" + k} style={{ position: "absolute", left: 0, right: 0, top: `${(k * 100) / 3}%`, height: 1, background: "rgba(255,255,255,0.25)" }} />)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 2px 4px" }}>
        <ZoomIn size={16} color={T.textDim} />
        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(+e.target.value)} aria-label={tr("Zoom")} data-testid="banner-zoom" style={{ flex: 1, accentColor: T.accent }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={onCancel} className="press" style={{ flex: 1, padding: 13, borderRadius: 16, border: `1px solid ${T.lineDark}`, background: "none", color: T.text, fontWeight: 600, fontSize: 15 }}>{tr("Cancel")}</button>
        <button data-testid="banner-use" onClick={save} disabled={!img} className="press" style={{ flex: 1, padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 15 }}>{tr("Use this")}</button>
      </div>
    </BottomSheet>
  );
}

// The banner at the top of a profile: the photo, or a soft gradient in the person's colour.
export function ProfileBanner({ url, hue = 350, testid = "profile-banner" }) {
  return (
    <div data-testid={testid} style={{
      width: "100%", aspectRatio: String(BANNER_ASPECT), position: "relative", overflow: "hidden",
      background: url ? `url(${url}) center/cover` : `radial-gradient(120% 140% at 85% 0%, hsla(${hue},55%,45%,0.55), transparent 60%), linear-gradient(135deg, hsl(${hue},25%,16%), ${T.surface})`,
    }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(12,13,16,0) 45%, rgba(12,13,16,0.85) 100%)" }} />
    </div>
  );
}
