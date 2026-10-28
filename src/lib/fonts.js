// Fonts we're choosing between. All are free and open source (SIL Open Font License or Apache 2.0)
// and come from Google Fonts. While we decide, Settings → Fonts (testing) switches them live.
// Once the fonts are picked, bundle the chosen files into the app (e.g. the @fontsource packages)
// so they also work offline, and remove this switcher.
//
// Each role: display = headings and big numbers, body = everything else, mono = plates, handles and tags,
// arabic = Arabic letters (used with the body and display fonts).

const f = (name, weights, note) => ({ name, weights, note });

export const FONT_CHOICES = {
  display: [
    f("Barlow Semi Condensed", [400, 500, 600, 700, 800], "Current. Narrow, sporty"),
    f("Space Grotesk", [400, 500, 600, 700], "Techy, quirky"),
    f("Sora", [400, 500, 600, 700, 800], "Round, modern"),
    f("Outfit", [400, 500, 600, 700, 800], "Clean geometric"),
    f("Rajdhani", [400, 500, 600, 700], "Squared, motorsport"),
    f("Oswald", [400, 500, 600, 700], "Tall, condensed"),
    f("Bebas Neue", [400], "All caps posters"),
    f("Saira Condensed", [400, 500, 600, 700, 800], "Racing numbers"),
    f("Chakra Petch", [400, 500, 600, 700], "Angular, dashboard"),
    f("Archivo", [400, 500, 600, 700, 800], "Strong, versatile"),
    f("Exo 2", [400, 500, 600, 700, 800], "Futuristic"),
    f("Unbounded", [400, 500, 600, 700, 800], "Wide and loud"),
    f("Montserrat", [400, 500, 600, 700, 800], "Classic geometric"),
  ],
  body: [
    f("Inter", [400, 500, 600, 700, 800], "Current. Very readable"),
    f("Manrope", [400, 500, 600, 700, 800], "Friendly, modern"),
    f("Plus Jakarta Sans", [400, 500, 600, 700, 800], "Soft, premium"),
    f("DM Sans", [400, 500, 600, 700, 800], "Simple, compact"),
    f("Figtree", [400, 500, 600, 700, 800], "Warm, clear"),
    f("Poppins", [400, 500, 600, 700, 800], "Round, popular"),
    f("Roboto", [400, 500, 700], "Android default look"),
    f("Work Sans", [400, 500, 600, 700, 800], "Neutral"),
    f("Nunito Sans", [400, 600, 700, 800], "Rounded"),
    f("Barlow", [400, 500, 600, 700, 800], "Matches Barlow headings"),
    f("IBM Plex Sans", [400, 500, 600, 700], "Technical"),
  ],
  mono: [
    f("IBM Plex Mono", [400, 500, 600, 700], "Current"),
    f("JetBrains Mono", [400, 500, 600, 700, 800], "Sharp"),
    f("Space Mono", [400, 700], "Retro"),
    f("Roboto Mono", [400, 500, 600, 700], "Plain"),
    f("DM Mono", [400, 500], "Light, elegant"),
    f("Fira Code", [400, 500, 600, 700], "Developer classic"),
  ],
  arabic: [
    f("IBM Plex Sans Arabic", [400, 500, 600, 700], "Pairs with IBM Plex / Inter"),
    f("Cairo", [400, 500, 600, 700, 800], "Very popular, modern"),
    f("Tajawal", [400, 500, 700, 800], "Light, clean"),
    f("Almarai", [400, 700, 800], "Used by many Gulf apps"),
    f("Noto Kufi Arabic", [400, 500, 600, 700, 800], "Geometric Kufi"),
    f("Noto Sans Arabic", [400, 500, 600, 700, 800], "Neutral, huge coverage"),
    f("Readex Pro", [400, 500, 600, 700], "Arabic + Latin together"),
    f("Alexandria", [400, 500, 600, 700, 800], "Bold, geometric"),
    f("Changa", [400, 500, 600, 700, 800], "Condensed, sporty"),
    f("Rubik", [400, 500, 600, 700, 800], "Rounded, Arabic + Latin"),
  ],
};

export const DEFAULT_FONTS = { display: "Barlow Semi Condensed", body: "Inter", mono: "IBM Plex Mono", arabic: "IBM Plex Sans Arabic" };
const KEY = "carfooly-fonts";
const FALLBACK = { display: "'Arial Narrow',ui-sans-serif,system-ui,sans-serif", body: "ui-sans-serif,system-ui,-apple-system,sans-serif", mono: "'SFMono-Regular',ui-monospace,monospace" };

export function savedFonts() {
  try { return { ...DEFAULT_FONTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULT_FONTS }; }
}

const find = (role, name) => FONT_CHOICES[role].find((x) => x.name === name) || FONT_CHOICES[role][0];
const cssUrl = (font) => `https://fonts.googleapis.com/css2?family=${font.name.replace(/ /g, "+")}:wght@${font.weights.join(";")}&display=swap`;

// Loads the picked fonts and points the app's font settings at them.
export function applyFonts(picked = savedFonts()) {
  const root = document.documentElement.style;
  const ar = `'${find("arabic", picked.arabic).name}'`;
  root.setProperty("--font-display", `'${find("display", picked.display).name}',${ar},${FALLBACK.display}`);
  root.setProperty("--font-body", `'${find("body", picked.body).name}',${ar},${FALLBACK.body}`);
  root.setProperty("--font-mono", `'${find("mono", picked.mono).name}',${ar},${FALLBACK.mono}`);
  if (window.__noWebFonts) return; // tests: no internet
  ["display", "body", "mono", "arabic"].forEach((role) => {
    const font = find(role, picked[role]);
    const id = `font-${role}`;
    let link = document.getElementById(id);
    if (!link) { link = document.createElement("link"); link.id = id; link.rel = "stylesheet"; document.head.appendChild(link); }
    const url = cssUrl(font);
    if (link.href !== url) link.href = url;
  });
}

export function setFont(role, name) {
  const next = { ...savedFonts(), [role]: name };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  applyFonts(next);
  return next;
}

export function resetFonts() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  applyFonts(DEFAULT_FONTS);
  return { ...DEFAULT_FONTS };
}
