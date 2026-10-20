import { Car, Plus, Compass, User } from "lucide-react";
import { T } from "../theme";

const ITEMS = [
  { id: "feed", label: "Feed", icon: Car },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "add", label: "Add", icon: Plus },
  { id: "profile", label: "Profile", icon: User },
];

// Floating pill nav. `active` is the tab to light up; `onTab` switches tabs.
export function BottomNav({ active, onTab, hidden }) {
  return (
    <div className="glass" style={{
      position: "fixed", bottom: "calc(14px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 32px)", maxWidth: 360, display: "flex", borderRadius: 999,
      padding: "5px 8px", zIndex: 20, gap: 2,
      opacity: hidden ? 0 : 1, pointerEvents: hidden ? "none" : "auto", transition: "opacity 0.2s ease",
    }}>
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const on = active === id;
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
