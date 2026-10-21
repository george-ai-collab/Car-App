import { Image as ImageIcon, MapPin, Calendar, Car } from "lucide-react";
import { T } from "../theme";

const OPTIONS = [
  { id: "post", label: "Post", sub: "Photos of a car", icon: ImageIcon, color: T.accent },
  { id: "spot", label: "Spot", sub: "A car you saw", icon: MapPin, color: T.accent2 },
  { id: "meet", label: "Meet", sub: "Plan an event", icon: Calendar, color: "#BFE0EC" },
  { id: "car", label: "Add car", sub: "To your garage", icon: Car, color: T.accentWarm },
];

// The small pop-up above the + button (like Instagram/TikTok), instead of a whole page.
export function AddMenu({ open, onClose, onPick }) {
  if (!open) return null;
  return (
    <>
      <div data-sheet-backdrop onClick={onClose} className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(6,6,7,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      <div data-testid="add-menu" className="glass pop-in" style={{
        position: "fixed", left: "50%", bottom: "calc(86px + env(safe-area-inset-bottom))", transform: "translateX(-50%)",
        width: "calc(100% - 48px)", maxWidth: 340, zIndex: 41, borderRadius: 26, padding: 10,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
      }}>
        {OPTIONS.map(({ id, label, sub, icon: Icon, color }) => (
          <button key={id} data-testid={`add-${id}`} onClick={() => { onClose(); onPick(id); }} className="press" style={{
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 18, border: "none",
            background: "rgba(255,255,255,0.06)", textAlign: "left",
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={19} color={color} />
            </div>
            <div>
              <div style={{ color: T.text, fontSize: 14.5, fontWeight: 800 }}>{label}</div>
              <div style={{ color: T.textDim, fontSize: 11.5, marginTop: 1 }}>{sub}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
