// Design tokens shared by every screen.
// "Carbon & Rosso": cool graphite blacks (never pure black), warm ivory text, one restrained racing red,
// steel as the quiet second colour and champagne for highlights. Minimal on purpose: colour is used to
// point at things, not to decorate.
export const T = {
  bg: "#0C0D10",
  surface: "#15171B",
  surface2: "#1E2026",
  paper: "#F4F1EB",
  paper2: "#E6E1D8",
  ink: "#15161A",
  inkMuted: "#5E5B56",
  text: "#F3F0EA",
  textDim: "#9B978F",
  accent: "#D4434D",
  accent2: "#8A9BAA",
  accentDeep: "#7A1F27",
  accentWarm: "#CBB083",
  good: "#8FBF9A",
  lineDark: "rgba(243,240,234,0.09)",
  linePaper: "rgba(21,22,26,0.12)",
  shadowCard: "0 2px 12px rgba(0,0,0,0.34), 0 1px 2px rgba(0,0,0,0.4)",
  shadowRaised: "0 10px 30px rgba(0,0,0,0.45)",
  shadowAccent: "0 6px 18px rgba(212,67,77,0.28)",
  glassBg: "rgba(21,23,27,0.62)",
  glassBorder: "rgba(255,255,255,0.12)",
  glassHighlight: "inset 0 1px 0 rgba(255,255,255,0.07)",
  // Soft light in the background of every page: a red glow up top, steel down low.
  bgGradient: "radial-gradient(120% 60% at 0% 0%, rgba(212,67,77,0.11), transparent 60%), radial-gradient(90% 50% at 100% 100%, rgba(138,155,170,0.08), transparent 60%), linear-gradient(180deg, #0E1013 0%, #0C0D10 45%, #0B0C0E 100%)",
};

// Fonts are set in src/lib/fonts.js (picked in Settings → Fonts while we decide).
export const FONT_STACK = "var(--font-display, 'Barlow Semi Condensed','Arial Narrow',ui-sans-serif,system-ui,sans-serif)";
export const BODY_STACK = "var(--font-body, 'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif)";
export const MONO_STACK = "var(--font-mono, 'IBM Plex Mono','SFMono-Regular',ui-monospace,monospace)";

// Common button looks, so screens don't repeat long style objects.
export const primaryButton = (enabled = true) => ({
  width: "100%", padding: "13px 16px", borderRadius: 16, border: "none",
  background: enabled ? T.accent : T.surface2, color: enabled ? "#fff" : T.textDim,
  fontWeight: 600, fontSize: 15,
});

export const secondaryButton = {
  width: "100%", padding: "10px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`,
  background: T.surface, color: T.text, fontSize: 13, fontWeight: 600,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};

export const pillButton = (on) => ({
  padding: "8px 16px", borderRadius: 999, border: `1px solid ${on ? T.lineDark : T.accent}`,
  background: on ? "transparent" : T.accent, color: on ? T.text : "#fff",
  fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
  boxShadow: on ? "none" : T.shadowAccent,
});
