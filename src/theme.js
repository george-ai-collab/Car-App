// Design tokens shared by every screen.
export const T = {
  bg: "#0A0A0B",
  surface: "#18181B",
  surface2: "#221F20",
  paper: "#F6F5F3",
  paper2: "#E7E4E0",
  ink: "#141414",
  inkMuted: "#5C5A57",
  text: "#F5F4F2",
  textDim: "#9C9A97",
  accent: "#E63846",
  accent2: "#457B90",
  accentDeep: "#881E2D",
  accentWarm: "#F2B84B",
  lineDark: "rgba(245,244,242,0.10)",
  linePaper: "rgba(20,20,20,0.12)",
  shadowCard: "0 2px 10px rgba(0,0,0,0.32), 0 1px 2px rgba(0,0,0,0.4)",
  shadowRaised: "0 8px 24px rgba(0,0,0,0.4)",
  shadowAccent: "0 4px 14px rgba(230,56,70,0.3)",
  glassBg: "rgba(24,24,27,0.55)",
  glassBorder: "rgba(255,255,255,0.14)",
  glassHighlight: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

export const FONT_STACK = "'Barlow Semi Condensed','Arial Narrow',ui-sans-serif,system-ui,sans-serif";
export const BODY_STACK = "'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif";
export const MONO_STACK = "'IBM Plex Mono','SFMono-Regular',ui-monospace,monospace";

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
