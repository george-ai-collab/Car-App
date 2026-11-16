import { Component, createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { T, FONT_STACK, MONO_STACK } from "../theme";
import { LogoTile } from "./Logo";
import { hueForId } from "../lib/utils";
import { useKeyboardOffset } from "../lib/keyboard";
import { limitTyping } from "../lib/text";
import { tr } from "../lib/i18n";

export function GlobalStyle() {
  return (
    <style>{`
      /* Space taken by the phone's status bar (top) and gesture/home bar (bottom). The app draws edge to
         edge; the Android app sets these to the real sizes (see scripts/patch-android.mjs). */
      :root { --inset-top: env(safe-area-inset-top, 0px); --inset-bottom: env(safe-area-inset-bottom, 0px); }
      * { box-sizing: border-box; }
      html, body { margin: 0; overscroll-behavior: none; }
      *::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; -ms-overflow-style: none; }
      button { font-family: inherit; cursor: pointer; }
      input, textarea { font-family: inherit; }
      ::placeholder { color: ${T.textDim}; }
      .plate { font-family: ${MONO_STACK}; letter-spacing: 0.06em; text-transform: uppercase; }
      .plate.handle { text-transform: none; } /* handles are always lowercase */
      .display { font-family: ${FONT_STACK}; font-weight: 600; letter-spacing: 0.01em; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes logoPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.94); opacity: 0.85; } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes tabInEnd { from { opacity: 0; transform: translateX(var(--slide-from, 44px)); } to { opacity: 1; transform: none; } }
      @keyframes tabInStart { from { opacity: 0; transform: translateX(calc(var(--slide-from, 44px) * -1)); } to { opacity: 1; transform: none; } }
      [dir=rtl] { --slide-from: -44px; }
      @keyframes lizardIntro { 0% { opacity: 0; transform: scale(0.55) rotate(-200deg); } 55% { opacity: 1; transform: scale(1.04) rotate(12deg); } 75% { transform: scale(1) rotate(0deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
      @keyframes fadeOut { to { opacity: 0; } }
      @keyframes drawerInR { from { transform: translateX(100%); } }
      @keyframes drawerOutR { to { transform: translateX(100%); } }
      @keyframes drawerInL { from { transform: translateX(-100%); } }
      @keyframes drawerOutL { to { transform: translateX(-100%); } }
      @keyframes threadDraw { to { stroke-dashoffset: 0; } }
      @keyframes createPop { from { opacity: 0; transform: translateY(40px) scale(0.4); } }
      @keyframes orbit { 0% { transform: translate(0, 0); } 25% { transform: translate(2.5px, -2.5px); } 50% { transform: translate(0, -4px); } 75% { transform: translate(-2.5px, -2.5px); } 100% { transform: translate(0, 0); } }
      @keyframes bellRing { 0%, 100% { transform: rotate(0); } 15% { transform: rotate(16deg); } 30% { transform: rotate(-13deg); } 45% { transform: rotate(9deg); } 60% { transform: rotate(-5deg); } 75% { transform: rotate(2deg); } }
      @keyframes glowBlink { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,67,77,0); } 40% { box-shadow: 0 0 0 6px rgba(212,67,77,0.35), 0 0 18px 4px rgba(212,67,77,0.35); } }
      @keyframes introOut { 0%, 78% { opacity: 1; } 100% { opacity: 0; visibility: hidden; } }
      @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
      .fade-in { animation: fadeIn 0.25s ease both; }
      button { transition: opacity 0.15s ease, transform 0.1s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
      .press:active { transform: scale(0.96); }
      button:disabled { transition: none; }
      @keyframes heartPop { 0% { transform: scale(1); } 35% { transform: scale(1.35); } 60% { transform: scale(0.92); } 100% { transform: scale(1); } }
      .heart-pop { animation: heartPop 0.35s ease; }
      @keyframes sheetIn { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }
      @keyframes popIn { from { opacity: 0; transform: translate(-50%, 16px) scale(0.96); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
      @keyframes bigHeart { 0% { transform: translate(-50%,-50%) scale(0.3); opacity: 0; } 25% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; } 70% { transform: translate(-50%,-50%) scale(1); opacity: 1; } 100% { transform: translate(-50%,-70%) scale(0.9); opacity: 0; } }
      .big-heart { animation: bigHeart 0.8s ease forwards; }
      .pop-in { animation: popIn 0.2s cubic-bezier(0.32, 0.72, 0, 1) both; }
      .sheet-in { animation: sheetIn 0.3s cubic-bezier(0.32, 0.72, 0, 1) backwards; }
      .glass {
        background: ${T.glassBg};
        backdrop-filter: blur(22px) saturate(170%);
        -webkit-backdrop-filter: blur(22px) saturate(170%);
        border: 1px solid ${T.glassBorder};
        box-shadow: ${T.glassHighlight}, ${T.shadowRaised};
      }
      /* Right-to-left languages: no letter spacing (it breaks joined Arabic letters); typed text follows its own direction */
      [dir=rtl] .plate { letter-spacing: 0; }
      [dir=rtl] input, [dir=rtl] textarea { unicode-bidi: plaintext; }
      /* Right-to-left languages: arrows point the other way */
      [dir=rtl] .lucide-chevron-left, [dir=rtl] .lucide-chevron-right, [dir=rtl] .lucide-arrow-left, [dir=rtl] .lucide-arrow-right, [dir=rtl] .flip-rtl { transform: scaleX(-1); }
      .glass-light {
        background: rgba(255,255,255,0.10);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255,255,255,0.18);
      }
    `}</style>
  );
}

// While the app loads its data: plain background, so opening the app doesn't flash a screen.
// Only if loading is slow (bad connection) does the logo appear, so it doesn't look frozen.
export function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 900); return () => clearTimeout(t); }, []);
  return (
    <div data-testid="loading" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: T.text }}>
      {slow && <div style={{ animation: "fadeIn .4s ease" }}><LogoTile size={84} style={{ animation: "logoPulse 1.6s ease-in-out infinite" }} /></div>}
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

export function IconTab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} aria-label={label} className="press" style={{
      width: 46, height: 40, borderRadius: 999, border: `1px solid ${active ? T.accent : T.lineDark}`,
      background: active ? T.accent : T.surface, color: active ? "#fff" : T.textDim,
      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? T.shadowAccent : "none",
    }}>
      {icon}
    </button>
  );
}

export function IconBadge({ children, tone = "accent", size = 40 }) {
  const bg = tone === "accent" ? "rgba(212,67,77,0.16)"
    : tone === "teal" || tone === "accent2" ? "rgba(138,155,170,0.18)"
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

export function TextInput({ value, onChange, placeholder, icon, autoFocus, maxLength, onFocus, onBlur, inputMode, invalid }) {
  return (
    <div style={{ position: "relative" }}>
      {icon && <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textDim }}>{icon}</div>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength}
        onFocus={onFocus} onBlur={onBlur} inputMode={inputMode} aria-invalid={invalid || undefined}
        style={{ width: "100%", padding: icon ? "11px 14px 11px 34px" : "11px 14px", borderRadius: 16, border: `1px solid ${invalid ? T.accent : T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }} />
    </div>
  );
}

export function BottomSheet({ open, onClose, title, children, maxHeight = "48vh", fixedHeight, footer }) {
  const sheets = useContext(SheetContext);
  const kb = useKeyboardOffset();
  const wasTyping = useRef(false);
  const sheetRef = useRef(null);
  const scrollRef = useRef(null); // the part that scrolls (the footer, if any, stays put below it)
  const backRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open || !sheets) return;
    sheets(1);
    return () => sheets(-1);
  }, [open]);

  // Drag down to close: grab the sheet anywhere while it's scrolled to the top (or the handle any
  // time) and pull down. Let go past ~1/4 of its height, or flick down, and it closes; otherwise
  // it springs back.
  useEffect(() => {
    const el = sheetRef.current;
    const sc = scrollRef.current;
    if (!open || !el || !sc) return;
    let startY = 0, startT = 0, dy = 0, tracking = false, dragging = false, fromHandle = false;
    const skip = (t) => t.closest?.("input, textarea, select, [contenteditable], [data-noswipe], input[type=range]");
    const set = (y, animate) => {
      el.style.transition = animate ? "transform 0.22s ease, bottom 0.18s ease" : "bottom 0.18s ease";
      el.style.transform = `translate(-50%, ${y}px)`;
      if (backRef.current) {
        backRef.current.style.transition = animate ? "opacity 0.22s ease" : "none";
        backRef.current.style.opacity = String(Math.max(0.15, 1 - y / (el.offsetHeight || 400)));
      }
    };
    const begin = (y, target) => {
      if (skip(target)) return;
      fromHandle = !!target.closest?.("[data-sheet-handle]");
      if (!fromHandle && sc.scrollTop > 0) return;
      tracking = true; dragging = false; startY = y; startT = Date.now(); dy = 0;
    };
    const move = (y, e) => {
      if (!tracking) return;
      dy = y - startY;
      if (!dragging) {
        if (dy < -4 && !fromHandle) { tracking = false; return; } // scrolling the content up
        if (dy > 6 && (fromHandle || sc.scrollTop <= 0)) dragging = true;
      }
      if (dragging) {
        if (e.cancelable) e.preventDefault();
        set(Math.max(0, dy), false);
      }
    };
    const end = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      const speed = dy / Math.max(1, Date.now() - startT); // px per ms
      if (dy > (el.offsetHeight || 400) * 0.25 || (dy > 40 && speed > 0.6)) {
        set(el.offsetHeight + 40, true);
        setTimeout(() => closeRef.current(), 200);
      } else set(0, true);
      dragging = false;
    };
    const ts = (e) => begin(e.touches[0].clientY, e.target);
    const tm = (e) => move(e.touches[0].clientY, e);
    const md = (e) => { if (e.pointerType === "mouse" && e.button === 0) begin(e.clientY, e.target); };
    const mm = (e) => { if (e.pointerType === "mouse") move(e.clientY, e); };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    el.addEventListener("pointerdown", md);
    window.addEventListener("pointermove", mm);
    window.addEventListener("pointerup", end);
    return () => {
      el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end);
      el.removeEventListener("pointerdown", md);
      window.removeEventListener("pointermove", mm); window.removeEventListener("pointerup", end);
    };
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
      <div ref={backRef} data-sheet-backdrop onPointerDown={onBackdropDown} onClick={onBackdrop} className="fade-in" style={{
        position: "fixed", inset: 0, zIndex: 40, background: "rgba(6,6,7,0.78)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }} />
      {/* Solid background: a see-through panel picked up the colours of the photo behind it. */}
      <div ref={sheetRef} data-sheet className="sheet-in" style={{
        position: "fixed", left: "50%", bottom: kb, transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, zIndex: 41,
        maxHeight: kb ? `min(${maxHeight}, ${Math.max(200, window.innerHeight - kb - 40)}px)` : maxHeight,
        // Fixed-height panels (comments) leave room above them while typing, so a tap there closes the keyboard.
        ...(fixedHeight ? { height: kb ? `min(${maxHeight}, ${Math.max(200, window.innerHeight - kb - 110)}px)` : maxHeight, ...(kb ? { maxHeight: `${Math.max(200, window.innerHeight - kb - 110)}px` } : {}) } : {}),
        borderRadius: kb ? 26 : "26px 26px 0 0",
        background: SHEET_BG, border: `1px solid ${T.glassBorder}`, borderBottom: "none", boxShadow: T.shadowRaised,
        display: "flex", flexDirection: "column", overflow: "hidden", transition: "bottom 0.18s ease",
      }}>
       <div ref={scrollRef} style={{
        flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain",
        padding: footer ? "10px 20px 12px" : kb ? "10px 20px 12px" : "10px 20px calc(24px + var(--inset-bottom))",
       }}>
        {/* Handle + title stay pinned at the top while the content scrolls (and the handle can
            always be dragged to close). A bigger invisible grab area surrounds the little bar. */}
        <div data-sheet-handle style={{ position: "sticky", top: -10, zIndex: 2, margin: "-10px -20px 0", padding: "14px 20px 0", background: SHEET_BG, touchAction: "none", cursor: "grab" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.25)", margin: "0 auto 16px" }} />
          {title && <div className="display" style={{ fontSize: 18, color: T.text, paddingBottom: 14 }}>{title}</div>}
        </div>
        {children}
       </div>
       {/* Pinned under the scrolling part, down to the bottom edge (e.g. the comment box). */}
       {footer && (
         <div data-sheet-footer style={{ flexShrink: 0, background: SHEET_BG, borderTop: `1px solid ${T.lineDark}`, padding: kb ? "10px 20px 12px" : "10px 20px calc(14px + var(--inset-bottom))" }}>
           {footer}
         </div>
       )}
      </div>
    </>
  );
}
const SHEET_BG = "#141417";

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
        <button data-nav-back onClick={onBack} aria-label={tr("Back")} className="press" style={{ background: "rgba(255,255,255,0.08)", border: "none", padding: 8, borderRadius: 999, display: "flex" }}>
          <ArrowLeft size={18} color={T.text} />
        </button>
      )}
      {title && <div className="display" style={{ fontSize: 18, color: T.text, flex: 1 }}>{title}</div>}
      {right}
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, maxLength, rows = 4, autoFocus, maxLines }) {
  const lines = (value || "").split("\n").length;
  return (
    <div>
      <textarea value={value} onChange={(e) => onChange(limitTyping(e.target.value, value, maxLines))} placeholder={placeholder} rows={rows} maxLength={maxLength} autoFocus={autoFocus}
        style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none", resize: "none", lineHeight: 1.45 }} />
      {maxLength && <div style={{ textAlign: "right", fontSize: 11, color: T.textDim, marginTop: 4 }}>{maxLines && lines > 1 ? tr("{0}/{1} lines · ", lines, maxLines) : ""}{value.length}/{maxLength}</div>}
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
            background: "rgba(255,255,255,0.06)", color: it.danger ? T.accent : T.text, fontSize: 15, fontWeight: 600, textAlign: "start",
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
        <button onClick={onClose} className="press" style={{ flex: 1, padding: "13px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.text, fontWeight: 600, fontSize: 15 }}>{tr("Cancel")}</button>
        <button onClick={() => { onClose(); onConfirm(); }} className="press" style={{ flex: 1, padding: "13px", borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15 }}>{confirmLabel}</button>
      </div>
    </BottomSheet>
  );
}

// Avatar with a small round follow badge under it (+ to follow, ✓ when following; tap to toggle).
export function FollowAvatar({ username, size, showFollow, following, onFollow, onOpen }) {
  const b = Math.max(18, Math.round(size * 0.32));
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size + (showFollow ? b / 2 : 0) }}>
      <button onClick={onOpen} aria-label={tr("Open {0}", username)} style={{ background: "none", border: "none", padding: 0, display: "flex" }} disabled={!onOpen}>
        <Avatar username={username} size={size} />
      </button>
      {showFollow && (
        <button data-testid="follow-badge" aria-label={following ? tr("Unfollow") : tr("Follow")} onClick={onFollow} className="press" style={{
          position: "absolute", left: "50%", top: size - b / 2, transform: "translateX(-50%)",
          width: b, height: b, borderRadius: 999, padding: 0, border: `2px solid ${T.bg}`,
          background: following ? "#fff" : T.accent, color: following ? T.accent : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: b * 0.7, fontWeight: 800, lineHeight: 1,
        }}>
          {following ? "✓" : "+"}
        </button>
      )}
    </div>
  );
}

// Text tabs with a red underline (Local / Global, Posts / Discuss / People).
export function Segmented({ value, onChange, options, testid }) {
  // The red line under the chosen tab slides to the new tab.
  const wrap = useRef(null);
  const [bar, setBar] = useState(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector(`[data-seg="${value}"]`);
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options.map((o) => o[1]).join("|")]);
  return (
    <div ref={wrap} data-testid={testid} style={{ position: "relative", display: "flex", gap: 22, borderBottom: `1px solid ${T.lineDark}`, marginBottom: 16 }}>
      {options.map(([id, label]) => {
        const on = value === id;
        return (
          <button key={id} data-seg={id} onClick={() => onChange(id)} className="press" style={{
            background: "none", border: "none", padding: "10px 0 12px", position: "relative",
            color: on ? T.text : T.textDim, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            transition: "color .2s ease",
          }}>
            {label}
          </button>
        );
      })}
      {bar && <span aria-hidden style={{ position: "absolute", bottom: -1, left: 0, width: bar.width, height: 2.5, borderRadius: 2, background: T.accent,
        transform: `translateX(${bar.left}px)`, transition: "transform .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1)" }} />}
    </div>
  );
}

// Wrap a tab's content: when the tab changes, the new content slides in from the side
// you're moving towards (mirrored in Arabic).
// fadeOnly: for content with fixed/sticky bars (a moving parent would drag them along).
export function TabSlide({ index, children, fadeOnly }) {
  const prev = useRef(index);
  const dir = index === prev.current ? 0 : index > prev.current ? 1 : -1;
  useEffect(() => { prev.current = index; }, [index]);
  const anim = dir === 0 ? "none" : fadeOnly ? "fadeIn .25s ease" : `${dir > 0 ? "tabInEnd" : "tabInStart"} .32s cubic-bezier(.2,.8,.2,1)`;
  return <div key={index} style={{ animation: anim }}>{children}</div>;
}

// A titled card that groups related fields, so a form reads in clear parts.
export function Section({ title, icon, hint, children, right, testid }) {
  return (
    <div data-testid={testid} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 22, padding: 16, marginBottom: 14, boxShadow: T.shadowCard }}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hint ? 4 : 14 }}>
          {icon}
          <div style={{ color: T.text, fontSize: 15, fontWeight: 700, flex: 1 }}>{title}</div>
          {right}
        </div>
      )}
      {hint && <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.4, marginBottom: 14 }}>{hint}</div>}
      {children}
    </div>
  );
}

// Tappable chips for picking one option (cars, communities…).
export function ChipPicker({ value, onChange, options, testid }) {
  return (
    <div data-testid={testid} data-noswipe style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, margin: "0 -2px" }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} className="press" style={{
            flexShrink: 0, padding: o.sub ? "8px 14px" : "9px 14px", borderRadius: 16, textAlign: "start",
            border: `1px solid ${on ? T.accent : T.lineDark}`, background: on ? "rgba(212,67,77,0.14)" : T.surface2, color: on ? T.text : T.textDim,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: on ? T.text : T.text, whiteSpace: "nowrap" }}>{o.label}</div>
            {o.sub && <div style={{ fontSize: 10.5, color: on ? T.accent : T.textDim, marginTop: 1, whiteSpace: "nowrap" }}>{o.sub}</div>}
          </button>
        );
      })}
    </div>
  );
}

// Clubs and businesses: a small label next to their name (profiles, posts).
export const isDriver = (user) => !user?.accountType || user.accountType === "personal";
export function AccountLabel({ username, onDark }) {
  const users = useContext(UsersContext);
  const t = users?.[username]?.accountType;
  if (t !== "club" && t !== "business") return null;
  return (
    <span data-testid="account-label" className="plate" style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 5, padding: "2px 6px", marginInlineStart: 6, verticalAlign: "middle",
      color: T.ink, background: T.paper, boxShadow: onDark ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
    }}>{t === "club" ? tr("CLUB") : tr("BUSINESS")}</span>
  );
}

// A panel that slides in from the side (right; left in Arabic) over the page, which stays
// visible and dimmed behind it. Tap outside, press back or drag it away to close.
// (No transform while open, so sheets and dialogs opened from inside it still sit on the screen.)
export function SideDrawer({ open, onClose, children, testid, width = "min(86vw, 380px)" }) {
  const sheets = useContext(SheetContext);
  const panel = useRef(null);
  const back = useRef(null);
  const [closing, setClosing] = useState(false);
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  useEffect(() => {
    if (!open || !sheets) return;
    sheets(1);
    return () => sheets(-1);
  }, [open]);
  useEffect(() => { if (open) setClosing(false); }, [open]);
  const close = () => { setClosing(true); setTimeout(() => { setClosing(false); onClose(); }, 220); };

  // Drag towards the edge to close.
  useEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    let x0 = 0, y0 = 0, dx = 0, on = false, dragging = false;
    const sign = rtl ? -1 : 1;
    const start = (e) => { if (e.target.closest?.("input, textarea, [data-noswipe]")) return; const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; on = true; dragging = false; };
    const move = (e) => {
      if (!on) return;
      const t = e.touches[0]; dx = (t.clientX - x0) * sign;
      if (!dragging) { if (Math.abs(t.clientY - y0) > 12 && Math.abs(t.clientY - y0) > Math.abs(dx)) { on = false; return; } if (dx > 8) dragging = true; }
      if (dragging) { e.cancelable && e.preventDefault(); el.style.transition = "none"; el.style.transform = `translateX(${Math.max(0, dx) * sign}px)`; if (back.current) back.current.style.opacity = String(Math.max(0.2, 1 - dx / el.offsetWidth)); }
    };
    const end = () => {
      if (!on) return; on = false;
      if (!dragging) return;
      if (dx > el.offsetWidth * 0.3) close();
      else { el.style.transition = "transform .2s ease"; el.style.transform = ""; if (back.current) back.current.style.opacity = "1"; }
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div ref={back} data-sheet-backdrop onClick={close} style={{ position: "fixed", inset: 0, zIndex: 38, background: "rgba(6,7,9,0.5)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
        animation: closing ? "fadeOut .22s ease forwards" : "fadeIn .22s ease" }} />
      <div ref={panel} data-testid={testid} data-drawer style={{
        position: "fixed", top: 0, bottom: 0, insetInlineEnd: 0, width, zIndex: 39, overflowY: "auto", overscrollBehavior: "contain",
        background: `linear-gradient(180deg, #17191E, ${T.bg})`, borderInlineStart: `1px solid ${T.glassBorder}`, boxShadow: "-20px 0 50px rgba(0,0,0,0.5)",
        borderStartStartRadius: 26, borderEndStartRadius: 26,
        padding: "calc(8px + var(--inset-top)) 18px calc(24px + var(--inset-bottom))",
        animation: closing ? `${rtl ? "drawerOutL" : "drawerOutR"} .22s ease forwards` : `${rtl ? "drawerInL" : "drawerInR"} .3s cubic-bezier(.2,.8,.2,1)`,
      }}>
        {children}
      </div>
    </>
  );
}

// Pull down at the top of a page to refresh. Works on any page: it only starts when nothing
// under your finger is scrolled down. Shows the lizard, which spins while loading.
export function PullRefresh({ onRefresh, enabled = true, logo }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const st = useRef(null);
  const busyRef = useRef(false);
  const MAX = 110, GO = 70;
  useEffect(() => {
    if (!enabled) return;
    const atTop = (node) => {
      if (window.scrollY > 0) return false;
      for (let n = node; n && n !== document.body; n = n.parentElement) {
        if (n.scrollTop > 0) return false;
        if (n.dataset && (n.dataset.sheetBackdrop !== undefined || n.dataset.drawer !== undefined || n.dataset.nopull !== undefined)) return false;
      }
      return true;
    };
    const start = (e) => { st.current = !busyRef.current && e.touches.length === 1 && atTop(e.target) ? { y: e.touches[0].clientY, x: e.touches[0].clientX, on: false } : null; };
    const move = (e) => {
      const s = st.current; if (!s) return;
      const dy = e.touches[0].clientY - s.y, dx = e.touches[0].clientX - s.x;
      if (!s.on) { if (dy < 0 || Math.abs(dx) > Math.abs(dy)) { st.current = null; return; } if (dy > 12) s.on = true; else return; }
      if (e.cancelable) e.preventDefault();
      setPull(Math.min(MAX, dy * 0.5));
    };
    const end = async () => {
      const s = st.current; st.current = null;
      if (!s || !s.on) { setPull(0); return; }
      let p = 0; setPull((v) => { p = v; return v; });
      if (p >= GO) {
        busyRef.current = true; setBusy(true); setPull(GO);
        try { await Promise.all([onRefresh?.(), new Promise((r) => setTimeout(r, 600))]); } catch { /* shown elsewhere */ }
        busyRef.current = false; setBusy(false);
      }
      setPull(0);
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => { document.removeEventListener("touchstart", start); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", end); document.removeEventListener("touchcancel", end); };
  }, [enabled, onRefresh]);
  if (!pull && !busy) return null;
  const ready = pull >= GO;
  return (
    <div data-testid="pull-refresh" data-busy={busy || undefined} aria-live="polite" style={{ position: "fixed", top: "calc(6px + var(--inset-top))", left: 0, right: 0, zIndex: 70, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ width: 44, height: 44, borderRadius: 999, background: ready || busy ? T.accent : T.surface2, border: `1px solid ${T.glassBorder}`, boxShadow: T.shadowRaised, display: "flex", alignItems: "center", justifyContent: "center",
        transform: `translateY(${pull - 20}px) scale(${Math.min(1, 0.5 + pull / 140)})`, opacity: Math.min(1, pull / 40), transition: st.current ? "none" : "transform .2s ease, opacity .2s ease" }}>
        {logo ? <img src={logo} alt="" style={{ width: 26, height: 26, transform: busy ? undefined : `rotate(${pull * 4}deg)`, animation: busy ? "spin .8s linear infinite" : "none" }} />
          : <Loader2 size={20} color="#fff" style={{ animation: busy ? "spin .8s linear infinite" : "none" }} />}
      </div>
    </div>
  );
}

// If a screen crashes, show a way back instead of a blank page.
export class ErrorScreen extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("screen crashed:", err); }
  componentDidUpdate(prev) { if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div data-testid="error-screen" style={{ padding: "80px 24px", textAlign: "center", color: T.text }}>
        <div className="display" style={{ fontSize: 22 }}>{tr("Something went wrong")}</div>
        <div style={{ color: T.textDim, fontSize: 14, margin: "8px 0 18px", lineHeight: 1.5 }}>{tr("This page hit a problem. Go back or reload the app.")}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {this.props.onBack && <button onClick={() => { this.setState({ failed: false }); this.props.onBack(); }} className="press" style={{ padding: "11px 18px", borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontWeight: 700 }}>{tr("Go back")}</button>}
          <button onClick={() => window.location.reload()} className="press" style={{ padding: "11px 18px", borderRadius: 999, border: "none", background: T.accent, color: "#fff", fontWeight: 700 }}>{tr("Reload")}</button>
        </div>
      </div>
    );
  }
}
