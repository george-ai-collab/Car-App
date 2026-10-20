import { createContext, useContext, useEffect, useRef } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { T, FONT_STACK, MONO_STACK } from "../theme";
import { hueForId } from "../lib/utils";
import { useKeyboardOffset } from "../lib/keyboard";

export function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body { margin: 0; max-width: 100%; overflow-x: hidden; overscroll-behavior-x: none; }
      *::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; -ms-overflow-style: none; }
      button { font-family: inherit; cursor: pointer; }
      input, textarea { font-family: inherit; }
      ::placeholder { color: ${T.textDim}; }
      .plate { font-family: ${MONO_STACK}; letter-spacing: 0.06em; text-transform: uppercase; }
      .display { font-family: ${FONT_STACK}; font-weight: 600; letter-spacing: 0.01em; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .fade-in { animation: fadeIn 0.25s ease both; }
      button { transition: opacity 0.15s ease, transform 0.1s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
      .press:active { transform: scale(0.96); }
      button:disabled { transition: none; }
      @keyframes heartPop { 0% { transform: scale(1); } 35% { transform: scale(1.35); } 60% { transform: scale(0.92); } 100% { transform: scale(1); } }
      .heart-pop { animation: heartPop 0.35s ease; }
      @keyframes sheetIn { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }
      .sheet-in { animation: sheetIn 0.3s cubic-bezier(0.32, 0.72, 0, 1) both; }
      .glass {
        background: ${T.glassBg};
        backdrop-filter: blur(22px) saturate(170%);
        -webkit-backdrop-filter: blur(22px) saturate(170%);
        border: 1px solid ${T.glassBorder};
        box-shadow: ${T.glassHighlight}, ${T.shadowRaised};
      }
      .glass-light {
        background: rgba(255,255,255,0.10);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255,255,255,0.18);
      }
    `}</style>
  );
}

export function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: T.text }}>
      <Loader2 size={28} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
      <div style={{ fontFamily: MONO_STACK, fontSize: 12, color: T.textDim, letterSpacing: "0.08em" }}>LOADING CARFOOLY</div>
    </div>
  );
}

// Lets any Avatar show a profile photo without passing users down every screen.
export const UsersContext = createContext({});

// Counts open bottom sheets so the shell can hide the floating nav behind them.
export const SheetContext = createContext(null);

export function Avatar({ username, size = 32 }) {
  const users = useContext(UsersContext);
  const hue = hueForId(username || "?");
  const photo = users?.[username]?.avatar;
  if (photo) {
    return (
      <img src={photo} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", flexShrink: 0, display: "block", background: T.surface2 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, background: `hsl(${hue},50%,32%)`,
      display: "flex", alignItems: "center", justifyContent: "center", color: T.text,
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {(username || "?")[0].toUpperCase()}
    </div>
  );
}

export function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${active ? T.accent : T.lineDark}`, background: active ? T.accent : "transparent", color: active ? T.ink : T.textDim, fontSize: 13, fontWeight: 600, boxShadow: active ? T.shadowAccent : "none" }}>
      {label}
    </button>
  );
}

export function IconTab({ active, onClick, icon }) {
  return (
    <button onClick={onClick} className="press" style={{
      width: 46, height: 40, borderRadius: 999, border: `1px solid ${active ? T.accent : T.lineDark}`,
      background: active ? T.accent : T.surface, color: active ? "#fff" : T.textDim,
      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? T.shadowAccent : "none",
    }}>
      {icon}
    </button>
  );
}

export function IconBadge({ children, tone = "accent", size = 40 }) {
  const bg = tone === "accent" ? "rgba(230,56,70,0.16)"
    : tone === "teal" || tone === "accent2" ? "rgba(69,123,144,0.18)"
    : tone === "warm" ? "rgba(242,184,75,0.18)"
    : "rgba(245,244,242,0.07)";
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.8, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, body }) {
  return (
    <div style={{ border: `1px solid ${T.lineDark}`, borderRadius: 22, padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)" }}>
      <IconBadge size={44}>{icon}</IconBadge>
      <div style={{ color: T.text, fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ color: T.textDim, fontSize: 13, maxWidth: 240, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, icon, autoFocus, maxLength }) {
  return (
    <div style={{ position: "relative" }}>
      {icon && <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textDim }}>{icon}</div>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength}
        style={{ width: "100%", padding: icon ? "11px 14px 11px 34px" : "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }} />
    </div>
  );
}

export function BottomSheet({ open, onClose, title, children, maxHeight = "48vh" }) {
  const sheets = useContext(SheetContext);
  const kb = useKeyboardOffset();
  const wasTyping = useRef(false);
  useEffect(() => {
    if (!open || !sheets) return;
    sheets(1);
    return () => sheets(-1);
  }, [open]);
  if (!open) return null;

  // Tapping the dim area while typing just closes the keyboard; the sheet (and what you typed) stays.
  // (The tap itself already moves focus away, so check what was focused when the finger went down.)
  const typingNow = () => {
    const el = document.activeElement;
    return !!(el && el.matches?.("input, textarea") && el.closest("[data-sheet]"));
  };
  const onBackdropDown = () => { wasTyping.current = typingNow() || kb > 0; };
  const onBackdrop = () => {
    if (wasTyping.current || typingNow()) {
      wasTyping.current = false;
      document.activeElement?.blur?.();
      return;
    }
    onClose();
  };

  return (
    <>
      <div data-sheet-backdrop onPointerDown={onBackdropDown} onClick={onBackdrop} className="fade-in" style={{
        position: "fixed", inset: 0, zIndex: 40, background: "rgba(6,6,7,0.78)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }} />
      <div data-sheet className="glass sheet-in" style={{
        position: "fixed", left: "50%", bottom: kb, transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, zIndex: 41,
        maxHeight: kb ? `min(${maxHeight}, ${Math.max(200, window.innerHeight - kb - 40)}px)` : maxHeight,
        borderRadius: kb ? 26 : "26px 26px 0 0",
        padding: kb ? "10px 20px 12px" : "10px 20px calc(24px + env(safe-area-inset-bottom))",
        overflowY: "auto", transition: "bottom 0.18s ease",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.25)", margin: "4px auto 16px" }} />
        {title && <div className="display" style={{ fontSize: 18, color: T.text, marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </>
  );
}

export function Stat({ label, value, small, dark }) {
  return (
    <div>
      <div style={{ color: dark ? T.text : T.ink, fontSize: small ? 13 : 17, fontWeight: 700 }}>{value}</div>
      <div className="plate" style={{ fontSize: 9.5, color: dark ? T.textDim : T.inkMuted, marginTop: 1 }}>{label}</div>
    </div>
  );
}

export function MiniStat({ value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ color: T.text, fontSize: 12.5, fontWeight: 700 }}>{value}</span>
      <span style={{ color: T.textDim, fontSize: 11 }}>{label}</span>
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div className="plate" style={{ fontSize: 11, color: T.textDim, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 14, height: 1, background: T.lineDark }} />{children}
    </div>
  );
}

export function TopBar({ onBack, title, right }) {
  if (!onBack && !title) return null;
  return (
    <div className="glass" style={{ position: "sticky", top: 0, zIndex: 10, padding: "12px 16px", borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none", display: "flex", alignItems: "center", gap: 12, minHeight: 58 }}>
      {onBack && (
        <button data-nav-back onClick={onBack} aria-label="Back" className="press" style={{ background: "rgba(255,255,255,0.08)", border: "none", padding: 8, borderRadius: 999, display: "flex" }}>
          <ArrowLeft size={18} color={T.text} />
        </button>
      )}
      {title && <div className="display" style={{ fontSize: 18, color: T.text, flex: 1 }}>{title}</div>}
      {right}
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, maxLength, rows = 4, autoFocus }) {
  return (
    <div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={maxLength} autoFocus={autoFocus}
        style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none", resize: "none", lineHeight: 1.45 }} />
      {maxLength && <div style={{ textAlign: "right", fontSize: 11, color: T.textDim, marginTop: 4 }}>{value.length}/{maxLength}</div>}
    </div>
  );
}

// A list of tappable rows inside a bottom sheet (the "..." menu on posts).
export function ActionMenu({ open, onClose, items }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.filter(Boolean).map((it) => (
          <button key={it.label} onClick={() => { onClose(); it.onClick(); }} className="press" style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", borderRadius: 16, border: "none",
            background: "rgba(255,255,255,0.06)", color: it.danger ? T.accent : T.text, fontSize: 15, fontWeight: 600, textAlign: "left",
          }}>
            {it.icon}{it.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

// "Are you sure?" pop-up for things that can't be undone.
export function ConfirmDialog({ open, title, body, confirmLabel = "Delete", onConfirm, onClose }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {body && <div style={{ color: T.textDim, fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>{body}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} className="press" style={{ flex: 1, padding: "13px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.text, fontWeight: 600, fontSize: 15 }}>Cancel</button>
        <button onClick={() => { onClose(); onConfirm(); }} className="press" style={{ flex: 1, padding: "13px", borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15 }}>{confirmLabel}</button>
      </div>
    </BottomSheet>
  );
}
