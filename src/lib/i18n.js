// Languages. Every piece of app text goes through tr("English text", ...values).
// The English text is the key; other languages map it in src/lib/lang/<code>.js.
// "{0}", "{1}" are filled with the values, so word order can change per language.
// Changing the language reloads the app, so every screen (and lists made when the app starts) switch together.
import { AR } from "./lang/ar";

export const LANGS = [
  { code: "en", name: "English", native: "English", dir: "ltr" },
  { code: "ar", name: "Arabic", native: "العربية", dir: "rtl" },
];
const DICTS = { ar: AR };
const KEY = "carfooly-lang";

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const saved = read();
export const lang = LANGS.some((l) => l.code === saved) ? saved : "en";
export const isRTL = LANGS.find((l) => l.code === lang)?.dir === "rtl";
const dict = DICTS[lang] || null;
// "@handle" in right-to-left text: a hidden left-to-right mark keeps the @ in front of the name.
export const AT = isRTL ? "\u200E@" : "@";

export function tr(key, ...vals) {
  let s = (dict && dict[key]) || key;
  if (vals.length) s = s.replace(/\{(\d+)\}/g, (m, i) => (vals[i] ?? ""));
  return s;
}

// Has the person picked a language yet? (asked once, on first open)
export const hasChosenLanguage = () => !!read();
// The phone's language, to pre-select on the first-open screen.
export const deviceLanguage = () => {
  const l = (navigator.languages?.[0] || navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGS.some((x) => x.code === l) ? l : "en";
};
export function setLanguage(code, { reload = true } = {}) {
  try { localStorage.setItem(KEY, code); } catch { /* private mode */ }
  if (reload) window.location.reload();
}

// Dates and times in the app's language (Western digits, to match the rest of the app).
export const locale = () => (lang === "ar" ? "ar-u-nu-latn" : undefined);

// Sets the page direction once at start-up.
export function applyLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
}
