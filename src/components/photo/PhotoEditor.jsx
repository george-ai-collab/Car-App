import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { T } from "../../theme";
import { uid } from "../../lib/utils";

export const PHOTO_FILTERS = [
  { id: "none", label: "None", css: "" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.05)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.1)" },
  { id: "warm", label: "Warm", css: "sepia(0.3) saturate(1.2) brightness(1.03)" },
  { id: "cool", label: "Cool", css: "hue-rotate(-8deg) saturate(1.1) brightness(1.02) contrast(1.05)" },
  { id: "fade", label: "Fade", css: "contrast(0.85) brightness(1.08) saturate(0.85)" },
];

// Photo shapes, like Instagram: keep the photo's own shape (within limits), or pick one.
export const PHOTO_SHAPES = [
  { id: "original", label: "Original" },
  { id: "4:5", label: "Portrait", ratio: 4 / 5 },
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "16:9", label: "Landscape", ratio: 16 / 9 },
];
const MIN_RATIO = 4 / 5;   // tallest allowed (portrait)
const MAX_RATIO = 1.91;    // widest allowed (landscape)

// width ÷ height of the final post
export function frameRatio(photo) {
  const shape = PHOTO_SHAPES.find((s) => s.id === photo.aspect);
  if (shape && shape.ratio) return shape.ratio;
  const r = photo.w && photo.h ? photo.w / photo.h : 1;
  return Math.max(MIN_RATIO, Math.min(MAX_RATIO, r));
}

// Which part of the original photo is kept, in source pixels.
function cropRect(photo) {
  const R = frameRatio(photo);
  const w = photo.w, h = photo.h, r = w / h;
  const ox = photo.ox ?? 0.5, oy = photo.oy ?? 0.5;
  if (r > R) {
    const cw = h * R;
    return { sx: ox * (w - cw), sy: 0, sw: cw, sh: h };
  }
  const ch = w / R;
  return { sx: 0, sy: oy * (h - ch), sw: w, sh: ch };
}

export function newPhoto(src, size) {
  return { src, w: size?.w || 0, h: size?.h || 0, aspect: "original", ox: 0.5, oy: 0.5, filter: "none", stickers: [] };
}

export function PhotoEditor({ photo, onChange }) {
  const frameRef = useRef(null);
  const drag = useRef(null);
  const latest = useRef(photo);
  latest.current = photo;
  const [moving, setMoving] = useState(false);

  const filter = photo.filter || "none";
  const stickers = photo.stickers || [];
  const filterCss = PHOTO_FILTERS.find((f) => f.id === filter)?.css || "";
  const ready = photo.w > 0 && photo.h > 0;
  const R = frameRatio(photo);
  const r = ready ? photo.w / photo.h : R;
  const wide = r > R; // photo is wider than the frame, so it slides left/right
  const ox = photo.ox ?? 0.5, oy = photo.oy ?? 0.5;
  const canPan = ready && Math.abs(r - R) > 0.01;

  const update = (patch) => onChange({ ...latest.current, ...patch });

  // Image size/position inside the frame, as % of the frame.
  const imgStyle = wide
    ? { height: "100%", width: `${(r / R) * 100}%`, top: 0, left: `${-ox * ((r / R) * 100 - 100)}%` }
    : { width: "100%", height: `${(R / r) * 100}%`, left: 0, top: `${-oy * ((R / r) * 100 - 100)}%` };

  const addSticker = () => update({ stickers: [...stickers, { id: uid("st"), x: 30, y: 40, w: 26, h: 12 }] });
  const removeSticker = (id) => update({ stickers: stickers.filter((s) => s.id !== id) });

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const rect = d.rect;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
    const p = latest.current;
    if (d.mode === "pan") {
      if (wide) {
        const overflow = rect.width * (r / R - 1);
        if (overflow > 0) update({ ox: Math.max(0, Math.min(1, (p.ox ?? 0.5) - dx / overflow)) });
      } else {
        const overflow = rect.height * (R / r - 1);
        if (overflow > 0) update({ oy: Math.max(0, Math.min(1, (p.oy ?? 0.5) - dy / overflow)) });
      }
      return;
    }
    const dxPct = (dx / rect.width) * 100, dyPct = (dy / rect.height) * 100;
    update({
      stickers: (p.stickers || []).map((s) => {
        if (s.id !== d.id) return s;
        if (d.mode === "move") return { ...s, x: Math.max(0, Math.min(100 - s.w, s.x + dxPct)), y: Math.max(0, Math.min(100 - s.h, s.y + dyPct)) };
        return { ...s, w: Math.max(8, Math.min(100 - s.x, s.w + dxPct)), h: Math.max(6, Math.min(100 - s.y, s.h + dyPct)) };
      }),
    });
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    drag.current = null;
    setMoving(false);
  };
  const startDrag = (e, mode, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (mode === "pan" && !canPan) return;
    drag.current = { mode, id, rect: frameRef.current.getBoundingClientRect(), x: e.clientX, y: e.clientY };
    if (mode === "pan") setMoving(true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {PHOTO_SHAPES.map((sh) => {
          const on = (photo.aspect || "original") === sh.id;
          return (
            <button key={sh.id} onClick={() => update({ aspect: sh.id, ox: 0.5, oy: 0.5 })} className="press" style={{
              flex: 1, padding: "7px 4px", borderRadius: 999, border: `1px solid ${on ? T.accent : T.lineDark}`,
              background: on ? "rgba(230,56,70,0.14)" : T.surface, color: on ? T.accent : T.textDim, fontSize: 11.5, fontWeight: 600,
            }}>
              {sh.label}
            </button>
          );
        })}
      </div>

      <div ref={frameRef} data-photo-frame onPointerDown={(e) => startDrag(e, "pan")} style={{
        position: "relative", borderRadius: 18, overflow: "hidden", touchAction: "none", background: "#000",
        aspectRatio: String(R), width: `min(100%, calc(58vh * ${R}))`, margin: "0 auto", cursor: canPan ? "grab" : "default",
      }}>
        <img src={photo.src} alt="" draggable={false}
          onLoad={(e) => { if (!ready) update({ w: e.target.naturalWidth, h: e.target.naturalHeight }); }}
          style={{ position: "absolute", maxWidth: "none", display: "block", filter: filterCss, userSelect: "none", pointerEvents: "none", ...(ready ? imgStyle : { width: "100%", height: "100%", objectFit: "cover", left: 0, top: 0 }) }} />
        {moving && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
            backgroundSize: "33.33% 33.33%" }} />
        )}
        {stickers.map((s) => (
          <div key={s.id} onPointerDown={(e) => startDrag(e, "move", s.id)} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`,
            background: "rgba(10,10,11,0.92)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab",
          }}>
            <span className="plate" style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>PLATE</span>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => removeSticker(s.id)} style={{
              position: "absolute", top: -8, right: -8, width: 18, height: 18, borderRadius: 999, background: T.accent,
              border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}>
              <Plus size={11} color="#fff" style={{ transform: "rotate(45deg)" }} />
            </button>
            <div onPointerDown={(e) => startDrag(e, "resize", s.id)} style={{
              position: "absolute", right: -4, bottom: -4, width: 16, height: 16, borderRadius: 999,
              background: "#fff", border: `2px solid ${T.accent}`, cursor: "nwse-resize",
            }} />
          </div>
        ))}
      </div>
      {canPan && <div style={{ fontSize: 11, color: T.textDim, marginTop: 6, textAlign: "center" }}>Drag the photo to choose what's in frame</div>}

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12, paddingBottom: 2 }}>
        {PHOTO_FILTERS.map((f) => (
          <button key={f.id} onClick={() => update({ filter: f.id })} className="press" style={{
            flexShrink: 0, padding: "7px 13px", borderRadius: 999, border: `1px solid ${filter === f.id ? T.accent : T.lineDark}`,
            background: filter === f.id ? "rgba(230,56,70,0.14)" : T.surface, color: filter === f.id ? T.accent : T.textDim,
            fontSize: 12, fontWeight: 600,
          }}>
            {f.label}
          </button>
        ))}
      </div>

      <button onClick={addSticker} className="press" style={{
        width: "100%", marginTop: 10, padding: "9px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`,
        background: T.surface, color: T.text, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <Plus size={13} /> Cover a plate
      </button>
      {stickers.length > 0 && <div style={{ fontSize: 11, color: T.textDim, marginTop: 6, textAlign: "center" }}>Drag a cover to move it, corner handle to resize</div>}
    </div>
  );
}

// Turns the edited photo into the final image: crop to the chosen shape, apply filter and plate covers.
// Returns { url, aspect } where aspect is width ÷ height.
export async function bakePhoto(photo) {
  if (!photo) return null;
  const filterCss = PHOTO_FILTERS.find((f) => f.id === photo.filter)?.css || "";
  const stickers = photo.stickers || [];
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const p = { ...photo, w: photo.w || img.naturalWidth, h: photo.h || img.naturalHeight };
      const { sx, sy, sw, sh } = cropRect(p);
      const scale = Math.min(1, 1080 / sw);
      const W = Math.round(sw * scale), H = Math.round(sh * scale);
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.filter = filterCss || "none";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      ctx.filter = "none";
      stickers.forEach((s) => {
        const x = (s.x / 100) * W, y = (s.y / 100) * H;
        const w = (s.w / 100) * W, h = (s.h / 100) * H;
        ctx.fillStyle = "rgba(10,10,11,0.96)";
        const rr = Math.min(10, w / 4, h / 4);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
        ctx.fill();
      });
      resolve({ url: canvas.toDataURL("image/jpeg", 0.75), aspect: W / H });
    };
    img.onerror = () => resolve({ url: photo.src, aspect: null });
    img.src = photo.src;
  });
}
