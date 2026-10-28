import { createContext, useContext, useEffect, useRef } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { T, FONT_STACK, MONO_STACK } from "../theme";
import { hueForId } from "../lib/utils";
import { useKeyboardOffset } from "../lib/keyboard";
import { limitTyping } from "../lib/text";

export function GlobalStyle() {
  return (
    <style>{`
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
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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

export function BottomSheet({ open, onClose, title, children, maxHeight = "48vh", fixedHeight }) {
  const sheets = useContext(SheetContext);
  const kb = useKeyboardOffset();
  const wasTyping = useRef(false);
  const sheetRef = useRef(null);
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
    if (!open || !el) return;
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
      if (!fromHandle && el.scrollTop > 0) return;
      tracking = true; dragging = false; startY = y; startT = Date.now(); dy = 0;
    };
    const move = (y, e) => {
      if (!tracking) return;
      dy = y - startY;
      if (!dragging) {
        if (dy < -4 && !fromHandle) { tracking = false; return; } // scrolling the content up
        if (dy > 6 && (fromHandle || el.scrollTop <= 0)) dragging = true;
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
      <div ref={sheetRef} data-sheet className="glass sheet-in" style={{
        position: "fixed", left: "50%", bottom: kb, transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, zIndex: 41,
        maxHeight: kb ? `min(${maxHeight}, ${Math.max(200, window.innerHeight - kb - 40)}px)` : maxHeight,
        // Fixed-height panels (comments) leave room above them while typing, so a tap there closes the keyboard.
        ...(fixedHeight ? { height: kb ? `min(${maxHeight}, ${Math.max(200, window.innerHeight - kb - 110)}px)` : maxHeight, ...(kb ? { maxHeight: `${Math.max(200, window.innerHeight - kb - 110)}px` } : {}) } : {}),
        borderRadius: kb ? 26 : "26px 26px 0 0",
        padding: kb ? "10px 20px 12px" : "10px 20px calc(24px + env(safe-area-inset-bottom))",
        overflowY: "auto", overscrollBehavior: "contain", transition: "bottom 0.18s ease",
      }}>
        {/* Handle + title stay pinned at the top while the content scrolls (and the handle can
            always be dragged to close). A bigger invisible grab area surrounds the little bar. */}
        <div data-sheet-handle style={{ position: "sticky", top: -10, zIndex: 2, margin: "-10px -20px 0", padding: "14px 20px 0", background: "#141417", touchAction: "none", cursor: "grab" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.25)", margin: "0 auto 16px" }} />
          {title && <div className="display" style={{ fontSize: 18, color: T.text, paddingBottom: 14 }}>{title}</div>}
        </div>
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

export function TextArea({ value, onChange, placeholder, maxLength, rows = 4, autoFocus, maxLines }) {
  const lines = (value || "").split("\n").length;
  return (
    <div>
      <textarea value={value} onChange={(e) => onChange(limitTyping(e.target.value, value, maxLines))} placeholder={placeholder} rows={rows} maxLength={maxLength} autoFocus={autoFocus}
        style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none", resize: "none", lineHeight: 1.45 }} />
      {maxLength && <div style={{ textAlign: "right", fontSize: 11, color: T.textDim, marginTop: 4 }}>{maxLines && lines > 1 ? `${lines}/${maxLines} lines · ` : ""}{value.length}/{maxLength}</div>}
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

// Avatar with a small round follow badge under it (+ to follow, ✓ when following; tap to toggle).
export function FollowAvatar({ username, size, showFollow, following, onFollow, onOpen }) {
  const b = Math.max(18, Math.round(size * 0.32));
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size + (showFollow ? b / 2 : 0) }}>
      <button onClick={onOpen} aria-label={`Open ${username}`} style={{ background: "none", border: "none", padding: 0, display: "flex" }} disabled={!onOpen}>
        <Avatar username={username} size={size} />
      </button>
      {showFollow && (
        <button data-testid="follow-badge" aria-label={following ? "Unfollow" : "Follow"} onClick={onFollow} className="press" style={{
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
  return (
    <div data-testid={testid} style={{ display: "flex", gap: 22, borderBottom: `1px solid ${T.lineDark}`, marginBottom: 16 }}>
      {options.map(([id, label]) => {
        const on = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} className="press" style={{
            background: "none", border: "none", padding: "10px 0 12px", position: "relative",
            color: on ? T.text : T.textDim, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            {label}
            <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, background: on ? T.accent : "transparent", transition: "background .15s ease" }} />
          </button>
        );
      })}
    </div>
  );
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
            flexShrink: 0, padding: o.sub ? "8px 14px" : "9px 14px", borderRadius: 16, textAlign: "left",
            border: `1px solid ${on ? T.accent : T.lineDark}`, background: on ? "rgba(230,56,70,0.14)" : T.surface2, color: on ? T.text : T.textDim,
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
      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 5, padding: "2px 6px", marginLeft: 6, verticalAlign: "middle",
      color: T.ink, background: T.paper, boxShadow: onDark ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
    }}>{t === "club" ? "CLUB" : "BUSINESS"}</span>
  );
}
