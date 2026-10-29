import { useRef, useState } from "react";
import { Car, Plus, Compass, User } from "lucide-react";
import { T } from "../theme";
import { tr, isRTL } from "../lib/i18n";

const ITEMS = [
  { id: "feed", label: tr("Feed"), icon: Car },
  { id: "discover", label: tr("Discover"), icon: Compass },
  { id: "add", label: tr("Add"), icon: Plus },
  { id: "profile", label: tr("Profile"), icon: User },
];
// Sliding across the bar moves between every tab, including + (the Create page).
const SWIPE_STOPS = ["feed", "discover", "add", "profile"];

// Floating pill nav. Tap a tab, or slide your finger along the bar like a gear selector.
export function BottomNav({ active, onTab, hidden, raised }) {
  const bar = useRef(null);
  const drag = useRef(null);
  const [preview, setPreview] = useState(null);

  const slotAt = (clientX) => {
    const r = bar.current.getBoundingClientRect();
    let i = Math.max(0, Math.min(ITEMS.length - 1, Math.floor(((clientX - r.left) / r.width) * ITEMS.length)));
    if (isRTL) i = ITEMS.length - 1 - i; // tabs run right to left
    return ITEMS[i].id;
  };
  const down = (e) => { drag.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; };
  const move = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.abs(e.clientX - d.x) > 14 && Math.abs(e.clientX - d.x) > Math.abs(e.clientY - d.y)) {
      d.moved = true;
      try { bar.current.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (d.moved) setPreview(slotAt(e.clientX));
  };
  const swallow = useRef(false);
  const up = (e) => {
    const d = drag.current;
    const target = d && d.moved ? slotAt(e.clientX) : null;
    drag.current = null;
    if (target) {
      setPreview(null);
      swallow.current = true; // the slide shouldn't also count as a tap
      if (SWIPE_STOPS.includes(target) && target !== active) onTab(target);
    }
  };
  const lit = preview || active;

  return (
    <div ref={bar} data-testid="bottom-nav" className="glass"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; setPreview(null); }}
      onClickCapture={(e) => { if (swallow.current) { swallow.current = false; e.stopPropagation(); e.preventDefault(); } }}
      style={{
        position: "fixed", bottom: "calc(14px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 32px)", maxWidth: 360, display: "flex", borderRadius: 999,
        padding: "5px 8px", zIndex: raised ? 45 : 20, gap: 2, touchAction: "none",
        opacity: hidden ? 0 : 1, pointerEvents: hidden ? "none" : "auto", transition: "opacity 0.2s ease",
      }}>
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const on = lit === id;
        return (
          <button key={id} aria-label={label} data-tab={id} onClick={() => onTab(id)} className="press"
            style={{ flex: 1, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
            <div style={{
              width: 50, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
              background: on ? T.accent : "transparent", boxShadow: on ? T.shadowAccent : "none", transition: "background 0.15s ease",
            }}>
              <Icon size={20} color={on ? "#fff" : T.textDim} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
