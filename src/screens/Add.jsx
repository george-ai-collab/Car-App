import { useState } from "react";
import { MapPin, Search, Sun, Maximize, Crosshair, Hand, AlertTriangle } from "lucide-react";
import { T } from "../theme";
import { TextInput, Section } from "../components/ui";
import { PhotoPicker } from "../components/photo/PhotoPicker";
import { tr } from "../lib/i18n";
import { checkPhoto } from "../lib/photoCheck";

const TIPS = [
  [Sun, "Good light", "Daylight or a well-lit spot. At night, turn on the flash."],
  [Maximize, "The whole car", "Fit the full body in the frame. A front corner works best."],
  [Crosshair, "In the middle", "Keep the car centred, not cut off at the edges."],
  [Hand, "Hold still", "A steady hand keeps it sharp."],
];

// Spot: feels like a camera. Snap first (camera only, taken right now), then say what it is.
export function SpotForm({ onSubmit, flash }) {
  const [photo, setPhoto] = useState(null);
  const [issues, setIssues] = useState(null); // { dark, blurry } after a quick check on the phone
  const take = async (src) => { setPhoto(src); setIssues(await checkPhoto(src)); };
  const retake = () => { setPhoto(null); setIssues(null); };
  const warn = issues && (issues.dark || issues.blurry);
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
          <button data-testid="spot-retake" onClick={retake} className="glass press" style={{ position: "absolute", right: 12, bottom: 12, border: "none", padding: "8px 14px", borderRadius: 999, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>{tr("Retake")}</button>
          <span className="plate" style={{ position: "absolute", left: 12, top: 12, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, padding: "4px 9px", borderRadius: 999 }}>{tr("Spotted")}</span>
          {warn && (
            <div data-testid="spot-photo-warning" style={{ position: "absolute", left: 10, right: 10, top: 44, padding: "10px 12px", borderRadius: 14, background: "rgba(20,20,23,0.88)", color: "#fff", fontSize: 12.5, lineHeight: 1.4, display: "flex", gap: 8 }}>
              <AlertTriangle size={16} color="#F2C76A" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <b>{issues.dark && issues.blurry ? tr("This looks dark and blurry.") : issues.dark ? tr("This looks quite dark.") : tr("This looks blurry.")}</b>{" "}
                {tr("A clearer photo helps people (and later our car check) see what it is. Retake it, or keep it if it's the best you can get.")}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div data-testid="spot-tips" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {TIPS.map(([Icon, title, body]) => (
              <div key={title} style={{ padding: "10px 11px", borderRadius: 14, background: T.surface, border: `1px solid ${T.lineDark}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.text, fontSize: 12.5, fontWeight: 800 }}><Icon size={14} color={T.accent2} /> {tr(title)}</div>
                <div style={{ color: T.textDim, fontSize: 11.5, lineHeight: 1.35, marginTop: 3 }}>{tr(body)}</div>
              </div>
            ))}
          </div>
          <PhotoPicker testid="spot-picker" cameraOnly onRefuse={flash} onPick={take} aspect={3 / 4} maxDim={1080} quality={0.72} title={tr("Point and shoot")} hint={tr("Spots use the camera, so every spot is real and taken right now.")}>
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
          {tr("If it matches a car with a page, the owner gets a \"spotted\" notification.")}
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
