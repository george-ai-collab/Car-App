import qrcode from "qrcode-generator";

// Share tags: a QR code for every profile and every car page.
// A tag only holds a permanent id (the handle, which can never change, or the car's id),
// so the same profile or car always gets the exact same QR code. It never rolls over.
export const TAG_SCHEME = "carfooly";

export const tagLink = (kind, id) => `${TAG_SCHEME}://${kind === "car" ? "car" : "u"}/${encodeURIComponent(id)}`;

// Reads a scanned code. Accepts our app links now, and web links (…/c/<id>, …/u/<handle>)
// for when the app has its own website.
export function parseTag(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  let m = t.match(/^carfooly:\/\/(car|u)\/([^/?#\s]+)/i);
  if (!m) m = t.match(/^https?:\/\/[^/]+\/(c|car|u)\/([^/?#\s]+)/i);
  if (!m) return null;
  const kind = m[1].toLowerCase().startsWith("c") ? "car" : "user";
  let id;
  try { id = decodeURIComponent(m[2]); } catch { return null; }
  return { kind, id: kind === "user" ? id.toLowerCase() : id };
}

// The QR grid. Highest error correction (H, ~30%) so the middle can stay empty for the logo
// and the code still scans. `hole` is the empty square in modules.
export function qrMatrix(text) {
  const qr = qrcode(0, "H");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let size = Math.round(n * 0.26);
  if (size % 2 !== n % 2) size += 1; // keep it exactly centred
  const start = (n - size) / 2;
  const inHole = (r, c) => r >= start && r < start + size && c >= start && c < start + size;
  return { n, hole: { start, size }, dark: (r, c) => !inHole(r, c) && qr.isDark(r, c) };
}
