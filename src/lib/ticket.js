// Meet tickets. Online, each ticket's code comes from the database (random, only you can read yours).
// Offline/test builds make a code from the meet and the person, so it stays the same.
const ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function localTicket(meetId, handle) {
  let h1 = 2166136261, h2 = 5381;
  const s = `${meetId}|${handle}|carfooly-ticket`;
  for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = (h2 * 33 + s.charCodeAt(i)) | 0; }
  let out = "";
  for (let i = 0; i < 8; i++) {
    const n = Math.abs(i < 4 ? h1 >> (i * 7) : h2 >> ((i - 4) * 7));
    out += ABC[n % ABC.length];
    if (i === 3) out += "-";
  }
  return out;
}

// "k7qm2xap", "K7QM 2XAP" → "K7QM-2XAP"
export function normalizeCode(text) {
  const c = String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
