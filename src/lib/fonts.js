// The app's fonts: the same for everyone (there's no per-person font setting).
// display = headings and big numbers, body = everything else, mono = number plates and handles.
// Arabic text uses its own font, loaded only when the app is in Arabic.
// They load from Google Fonts for now; before launch, bundle the picked files into the app
// (e.g. the @fontsource packages) so they also work offline.
import { lang } from "./i18n";

export const APP_FONTS = {
  display: { name: "Barlow Semi Condensed", weights: [500, 600, 700, 800] },
  body: { name: "Inter", weights: [400, 500, 600, 700, 800] },
  mono: { name: "IBM Plex Mono", weights: [400, 500, 600, 700] },
  arabic: { name: "IBM Plex Sans Arabic", weights: [400, 500, 600, 700] },
};
const FALLBACK = { display: "'Arial Narrow',ui-sans-serif,system-ui,sans-serif", body: "ui-sans-serif,system-ui,-apple-system,sans-serif", mono: "'SFMono-Regular',ui-monospace,monospace" };
const cssUrl = (f) => `https://fonts.googleapis.com/css2?family=${f.name.replace(/ /g, "+")}:wght@${f.weights.join(";")}&display=swap`;

export function applyFonts() {
  try { localStorage.removeItem("carfooly-fonts"); } catch { /* the old font tester's setting */ }
  const ar = lang === "ar";
  const root = document.documentElement.style;
  const arabic = ar ? `'${APP_FONTS.arabic.name}',` : "";
  // Latin font first, then the Arabic one: each letter uses the first font that has it.
  root.setProperty("--font-display", `'${APP_FONTS.display.name}',${arabic}${FALLBACK.display}`);
  root.setProperty("--font-body", `'${APP_FONTS.body.name}',${arabic}${FALLBACK.body}`);
  root.setProperty("--font-mono", `'${APP_FONTS.mono.name}',${arabic}${FALLBACK.mono}`);
  if (window.__noWebFonts) return; // tests: no internet
  ["display", "body", "mono", ...(ar ? ["arabic"] : [])].forEach((role) => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = cssUrl(APP_FONTS[role]); link.dataset.font = role;
    document.head.appendChild(link);
  });
}
