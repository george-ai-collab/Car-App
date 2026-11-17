// Words we don't allow in handles, captions, comments, bios, names, discussions and meets.
// The same list is copied into the database (supabase/migrations/0007_safety.sql), which has
// the final say; this copy lets the app warn before anything is sent.
//
// "any": blocked even inside other words (only for slurs that never appear inside normal words).
// "word": blocked only as a whole word (so "class", "bass", "عكس" are fine).
// Add or remove words in the database table public.banned_words (Table Editor) any time.
export const BANNED = [
  // English slurs (blocked anywhere)
  ["nigger", "any"], ["nigga", "any"], ["faggot", "any"], ["fagot", "any"], ["retard", "any"], ["kike", "word"], ["chink", "word"],
  ["spic", "word"], ["wetback", "any"], ["tranny", "any"], ["coon", "word"], ["paki", "word"], ["gook", "word"], ["raghead", "any"],
  ["towelhead", "any"], ["sandnigger", "any"], ["dyke", "word"], ["fag", "word"], ["beaner", "any"], ["zipperhead", "any"],
  // English profanity / abuse (whole words)
  ["fuck", "any"], ["fucker", "any"], ["motherfucker", "any"], ["shit", "word"], ["bitch", "any"], ["cunt", "word"], ["cunts", "word"], ["whore", "any"],
  ["slut", "any"], ["asshole", "any"], ["dick", "word"], ["pussy", "word"], ["cock", "word"], ["bastard", "word"], ["wanker", "any"],
  ["twat", "word"], ["kys", "word"], ["killyourself", "any"], ["rape", "word"], ["rapist", "any"], ["nazi", "word"], ["hitler", "any"],
  // Arabic (whole words)
  ["كس", "word"], ["كسك", "word"], ["كسمك", "any"], ["زب", "word"], ["زبي", "word"], ["شرموط", "any"], ["شرموطة", "any"], ["شرموطه", "any"],
  ["منيوك", "any"], ["منيوكة", "any"], ["قحبة", "any"], ["قحبه", "any"], ["عرص", "word"], ["معرص", "any"], ["خول", "word"], ["لوطي", "any"],
  ["زامل", "word"], ["ابن الكلب", "any"], ["يلعن", "word"], ["طيز", "word"], ["نيك", "word"], ["انيك", "any"],
];

// Handles kept back: the app itself, staff-looking names, and car brands (so the real brand can
// claim theirs later). Blocked as the whole handle, and as "<brand>_official", "official_<brand>"…
export const RESERVED = [
  "carfooly", "admin", "administrator", "support", "help", "official", "moderator", "mod", "mods", "staff", "team", "security",
  "system", "root", "owner", "founder", "verified", "news", "info", "contact", "app", "carfoolyapp", "carfooly_official",
  // brands
  "bmw", "mercedes", "mercedesbenz", "benz", "amg", "audi", "porsche", "volkswagen", "vw", "toyota", "lexus", "nissan", "infiniti",
  "honda", "acura", "mazda", "subaru", "mitsubishi", "suzuki", "hyundai", "kia", "genesis", "ford", "chevrolet", "chevy", "gmc",
  "cadillac", "dodge", "jeep", "ram", "chrysler", "tesla", "lucid", "rivian", "ferrari", "lamborghini", "maserati", "alfaromeo",
  "fiat", "bugatti", "mclaren", "astonmartin", "bentley", "rollsroyce", "jaguar", "landrover", "rangerover", "mini", "volvo",
  "polestar", "peugeot", "renault", "citroen", "skoda", "seat", "cupra", "opel", "lotus", "koenigsegg", "pagani", "rimac",
  "byd", "geely", "chery", "haval", "gwm", "mg", "jetour", "nio", "xpeng", "lancia", "dacia", "isuzu", "lincoln", "buick", "pontiac",
];

// Disguised spellings: 4→a, 3→e, 1→i, 0→o, 5/$→s, 7→t, @→a; repeated letters squeezed.
const LEET = { 4: "a", "@": "a", 3: "e", 1: "i", "!": "i", 0: "o", 5: "s", $: "s", 7: "t", 8: "b" };
export function normalize(text) {
  return String(text || "").toLowerCase().replace(/[4@31!05$78]/g, (c) => LEET[c] || c)
    .replace(/[ً-ْـ]/g, "") // Arabic diacritics and stretching
    .replace(/(.)\1{2,}/g, "$1$1");
}

const squeeze = (s) => s.replace(/[^a-z؀-ۿ]/g, "");
// Returns the first banned word found, or null.
export function findBanned(text, list = BANNED) {
  if (!text) return null;
  const n = normalize(text);
  const words = n.split(/[^a-z؀-ۿ]+/).filter(Boolean);
  const joined = squeeze(n);
  const spaced = ` ${words.join(" ")} `;
  for (const [w, mode] of list) {
    const nw = normalize(w);
    if (nw.includes(" ")) { if (spaced.includes(` ${nw} `)) return w; continue; }
    if (words.includes(nw)) return w;
    if (mode === "any" && joined.includes(squeeze(nw))) return w;
  }
  return null;
}

// Handles: no banned words anywhere in them (handles have no spaces to hide behind), not reserved.
export function handleProblem(handle) {
  const h = String(handle || "").toLowerCase();
  const core = h.replace(/[_.]/g, "");
  if (RESERVED.some((r) => core === r || core === `${r}official` || core === `official${r}` || core === `the${r}` || core === `${r}app`)) return "reserved";
  const j = squeeze(normalize(h));
  if (BANNED.some(([w, mode]) => mode === "any" && /[a-z]/.test(w) && j.includes(squeeze(normalize(w))))) return "not_allowed";
  if (findBanned(h.replace(/[_.]/g, " "))) return "not_allowed";
  return null;
}

export const RESPECT_MESSAGE = "That includes words we don't allow on Carfooly. Please keep it respectful.";
