import { Image as ImageIcon, MapPin, Calendar, Car } from "lucide-react";
import { T } from "../theme";

const OPTIONS = [
  { id: "post", label: "Post", sub: "Photos of a car", icon: ImageIcon, color: T.accent },
  { id: "spot", label: "Spot", sub: "A car you saw", icon: MapPin, color: T.accent2 },
  { id: "meet", label: "Meet", sub: "Plan an event", icon: Calendar, color: "#BFE0EC" },
  { id: "car", label: "Add car", sub: "To your garage", icon: Car, color: T.accentWarm },
];

// The "Add" page: four big square tiles.
export function AddPage({ onPick }) {
  return (
    <div>
      <div className="display" style={{ fontSize: 26, color: T.text }}>Create</div>
      <div style={{ color: T.textDim, fontSize: 13.5, marginBottom: 18 }}>What do you want to share?</div>
      <div data-testid="add-menu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {OPTIONS.map(({ id, label, sub, icon: Icon, color }) => (
          <button key={id} data-testid={`add-${id}`} onClick={() => onPick(id)} className="press" style={{
            aspectRatio: "1", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start",
            padding: 16, borderRadius: 24, border: `1px solid ${T.lineDark}`, textAlign: "left",
            background: `radial-gradient(120% 100% at 0% 0%, ${color}33, transparent 60%), linear-gradient(160deg, ${T.surface2}, ${T.surface})`,
            boxShadow: T.shadowCard,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={24} color={color} />
            </div>
            <div>
              <div style={{ color: T.text, fontSize: 18, fontWeight: 800 }}>{label}</div>
              <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 2 }}>{sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
