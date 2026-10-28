import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { T } from "../theme";
import { TextInput, Section } from "../components/ui";
import { PhotoPicker } from "../components/photo/PhotoPicker";
import { tr } from "../lib/i18n";

// Spot: feels like a camera. Snap first, then say what it is.
export function SpotForm({ onSubmit }) {
  const [photo, setPhoto] = useState(null);
  const [make, setMake] = useState(""); const [model, setModel] = useState("");
  const [year, setYear] = useState(""); const [trim, setTrim] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = photo && make.trim() && model.trim() && year.trim();
  const corner = (pos) => ({ position: "absolute", width: 34, height: 34, borderColor: "rgba(255,255,255,0.8)", borderStyle: "solid", borderWidth: 0, ...pos });

  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 24, color: T.text }}>{tr("Spot a car")}</div>
      <div style={{ fontSize: 13, color: T.textDim, marginBottom: 14 }}>{tr("Saw something good? Snap it and log it.")}</div>

      {photo ? (
        <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", marginBottom: 14 }}>
          <img src={photo} alt="" style={{ width: "100%", maxHeight: "50vh", objectFit: "cover", display: "block" }} />
          <button onClick={() => setPhoto(null)} className="glass press" style={{ position: "absolute", right: 12, bottom: 12, border: "none", padding: "8px 14px", borderRadius: 999, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>{tr("Retake")}</button>
          <span className="plate" style={{ position: "absolute", left: 12, top: 12, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, padding: "4px 9px", borderRadius: 999 }}>{tr("Spotted")}</span>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <PhotoPicker testid="spot-picker" onPick={(src) => setPhoto(src)} aspect={3 / 4} maxDim={1080} quality={0.72} title={tr("Point and shoot")} hint={tr("Get the whole car in frame.")}>
            <div style={corner({ top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 })} />
            <div style={corner({ top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 })} />
            <div style={corner({ bottom: 84, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 })} />
            <div style={corner({ bottom: 84, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 })} />
          </PhotoPicker>
        </div>
      )}

      <Section title={tr("What is it?")} icon={<Search size={16} color={T.accent2} />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><div className="plate" style={miniLabel}>{tr("Make")}</div><TextInput value={make} onChange={setMake} placeholder={tr("Nissan")} maxLength={30} /></div>
          <div><div className="plate" style={miniLabel}>{tr("Model")}</div><TextInput value={model} onChange={setModel} placeholder={tr("Skyline GT-R")} maxLength={40} /></div>
          <div><div className="plate" style={miniLabel}>{tr("Year")}</div><TextInput value={year} onChange={(v) => setYear(v.replace(/[^0-9]/g, ""))} placeholder="1999" maxLength={4} /></div>
          <div><div className="plate" style={miniLabel}>{tr("Trim (optional)")}</div><TextInput value={trim} onChange={setTrim} placeholder={tr("V-Spec")} maxLength={30} /></div>
        </div>
        <div style={{ fontSize: 11.5, color: T.textDim, lineHeight: 1.5, marginTop: 12 }}>
          {tr("If it matches a car with a page, the owner gets a \"spotted\" notification. Spots are marked unverified for now.")}
        </div>
      </Section>

      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ make, model, year, trim, photoUrl: photo }); setBusy(false); }}
        style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: valid ? T.accent2 : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15, opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <MapPin size={16} /> {busy ? tr("Logging…") : tr("Log spot")}
      </button>
    </div>
  );
}

const miniLabel = { fontSize: 10, color: T.textDim, marginBottom: 6 };
