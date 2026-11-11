import { Image as ImageIcon, MapPin, Calendar } from "lucide-react";
import { T } from "../theme";
import { tr } from "../lib/i18n";

const OPTIONS = [
  { id: "post", label: tr("Post"), sub: tr("Photos or a video of a car"), icon: ImageIcon, color: T.accent },
  { id: "spot", label: tr("Spot"), sub: tr("A car you see right now"), icon: MapPin, color: T.accent2 },
  { id: "meet", label: tr("Meet"), sub: tr("Plan an event"), icon: Calendar, color: "#BFE0EC" },
];

// The "Add" page: a big Post tile, then Spot and Meet. Clubs and businesses get Post and Meet
// (spots are for drivers). Adding your own car lives in your profile's garage.
export function AddPage({ onPick, driver = true }) {
  const options = driver ? OPTIONS : OPTIONS.filter((o) => o.id !== "spot");
  return (
    <div>
      <div className="display" style={{ fontSize: 26, color: T.text }}>{tr("Create")}</div>
      <div style={{ color: T.textDim, fontSize: 13.5, marginBottom: 18 }}>{tr("What do you want to share?")}</div>
      <div data-testid="add-menu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {options.map(({ id, label, sub, icon: Icon, color }, i) => {
          const big = i === 0 || !driver; // two tiles (clubs, businesses): both full width
          return (
            <button key={id} data-testid={`add-${id}`} onClick={() => onPick(id)} className="press" style={{
              gridColumn: big ? "1 / -1" : undefined, aspectRatio: big ? "16 / 10" : "1",
              display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start",
              padding: big ? 20 : 16, borderRadius: 24, border: `1px solid ${T.lineDark}`, textAlign: "start",
              background: `radial-gradient(120% 100% at 0% 0%, ${color}${big ? "44" : "33"}, transparent 60%), linear-gradient(160deg, ${T.surface2}, ${T.surface})`,
              boxShadow: T.shadowCard,
            }}>
              <div style={{ width: big ? 56 : 48, height: big ? 56 : 48, borderRadius: 16, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={big ? 28 : 24} color={color} />
              </div>
              <div>
                <div style={{ color: T.text, fontSize: big ? 24 : 18, fontWeight: 800 }}>{label}</div>
                <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
