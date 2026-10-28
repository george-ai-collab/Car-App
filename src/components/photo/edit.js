import { tr } from "../../lib/i18n";
// The maths behind the photo editor. The preview (CSS) and the saved photo (canvas)
// both use these, so what you see while editing is what gets posted.
//
// A photo being edited:
// { src, w, h,                       original pixels
//   zoom (1–4), rot (0–3 = ×90°), straighten (−15…15°),
//   panX, panY (offset in the image's own direction, in frame widths),
//   filter, adjust: { brightness, contrast, saturation, warmth } (−100…100),
//   texts: [{ id, text, x, y (0–1 of frame), size (of frame width), color }],
//   stickers: [{ id, x, y, w, h } in % of frame]  (plate covers) }

export const SHAPES = [
  { id: "original", label: tr("Original") },
  { id: "4:5", label: tr("Portrait"), ratio: 4 / 5 },
  { id: "1:1", label: tr("Square"), ratio: 1 },
  { id: "16:9", label: tr("Landscape"), ratio: 16 / 9 },
];
const MIN_R = 4 / 5, MAX_R = 1.91;

export const FILTERS = [
  { id: "none", label: tr("Normal"), css: "" },
  { id: "vivid", label: tr("Vivid"), css: "saturate(1.55) contrast(1.1)" },
  { id: "street", label: tr("Street"), css: "contrast(1.2) saturate(0.85) brightness(0.95)" },
  { id: "golden", label: tr("Golden"), css: "sepia(0.35) saturate(1.3) brightness(1.04)" },
  { id: "night", label: tr("Night"), css: "hue-rotate(-12deg) saturate(1.2) contrast(1.15) brightness(0.9)" },
  { id: "fade", label: tr("Fade"), css: "contrast(0.85) brightness(1.08) saturate(0.8)" },
  { id: "mono", label: tr("Mono"), css: "grayscale(1) contrast(1.1)" },
  { id: "noir", label: tr("Noir"), css: "grayscale(1) contrast(1.45) brightness(0.9)" },
];

export const TEXT_COLORS = ["#FFFFFF", "#141414", "#E63846", "#F2B84B", "#457B90", "#7BD389"];

export function blankEdit(src, w, h) {
  return {
    src, w, h, zoom: 1, rot: 0, straighten: 0, panX: 0, panY: 0, filter: "none",
    adjust: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }, texts: [], stickers: [],
  };
}

// Width ÷ height of the post. "Original" follows the first photo (kept within Instagram-like limits).
export function shapeRatio(shape, first) {
  const s = SHAPES.find((x) => x.id === shape);
  if (s && s.ratio) return s.ratio;
  if (!first || !first.w) return 1;
  const quarter = first.rot % 2 === 1;
  const r = quarter ? first.h / first.w : first.w / first.h;
  return Math.max(MIN_R, Math.min(MAX_R, r));
}

const rad = (d) => (d * Math.PI) / 180;
export const angleOf = (e) => e.rot * 90 + e.straighten;

// How much the image must be scaled so it always fills a W×H frame at this angle and zoom.
export function coverScale(e, W, H) {
  const t = rad(angleOf(e)), c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
  const need = Math.max((W * c + H * s) / e.w, (W * s + H * c) / e.h);
  return need * e.zoom;
}

// Keep the pan inside what still covers the frame (pan is in frame widths, image direction).
export function clampPan(e, W, H, px, py) {
  const t = rad(angleOf(e)), c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
  const sc = coverScale(e, W, H);
  const mx = Math.max(0, (sc * e.w - (W * c + H * s)) / 2) / W;
  const my = Math.max(0, (sc * e.h - (W * s + H * c)) / 2) / W;
  return { panX: Math.max(-mx, Math.min(mx, px)), panY: Math.max(-my, Math.min(my, py)) };
}

// Screen drag (dx, dy in px) → change in pan (image direction, frame widths).
export function dragToPan(e, W, dx, dy) {
  const t = rad(-angleOf(e));
  return { x: (dx * Math.cos(t) - dy * Math.sin(t)) / W, y: (dx * Math.sin(t) + dy * Math.cos(t)) / W };
}

export function cssFilter(e) {
  const f = FILTERS.find((x) => x.id === e.filter)?.css || "";
  const a = e.adjust || {};
  const parts = [f];
  if (a.brightness) parts.push(`brightness(${1 + a.brightness / 200})`);
  if (a.contrast) parts.push(`contrast(${1 + a.contrast / 200})`);
  if (a.saturation) parts.push(`saturate(${1 + a.saturation / 100})`);
  return parts.filter(Boolean).join(" ") || "none";
}

// Warmth is a soft orange (warm) or blue (cool) wash on top.
export function warmthLayer(e) {
  const w = e.adjust?.warmth || 0;
  if (!w) return null;
  return { color: w > 0 ? "#FF9A3C" : "#3C8DFF", alpha: Math.min(0.45, Math.abs(w) / 220) };
}

// Draw the finished photo. Returns { url, aspect }.
export function bakeEdit(e, ratio, maxW = 1080) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = maxW, H = Math.round(maxW / ratio);
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      const sc = coverScale(e, W, H);
      ctx.save();
      ctx.filter = cssFilter(e);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(rad(angleOf(e)));
      ctx.translate(e.panX * W, e.panY * W);
      ctx.scale(sc, sc);
      ctx.drawImage(img, -e.w / 2, -e.h / 2, e.w, e.h);
      ctx.restore();
      const warm = warmthLayer(e);
      if (warm) {
        ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = warm.alpha * 1.6;
        ctx.fillStyle = warm.color; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      (e.stickers || []).forEach((s) => {
        const x = (s.x / 100) * W, y = (s.y / 100) * H, w = (s.w / 100) * W, h = (s.h / 100) * H, r = Math.min(10, w / 4, h / 4);
        ctx.fillStyle = "rgba(10,10,11,0.96)";
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
      });
      (e.texts || []).forEach((t) => {
        const size = Math.round(t.size * W);
        ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = size * 0.25;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x * W, t.y * H);
        ctx.shadowBlur = 0;
      });
      resolve({ url: canvas.toDataURL("image/jpeg", 0.8), aspect: W / H });
    };
    img.onerror = () => resolve({ url: e.src, aspect: ratio });
    img.src = e.src;
  });
}
