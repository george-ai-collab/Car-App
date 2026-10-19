import { useState } from "react";
import { Car, MapPin, Image as ImageIcon, ChevronRight } from "lucide-react";
import { T } from "../theme";
import { CameraCapture } from "../components/photo/CameraCapture";
import { PhotoEditor, bakePhoto, newPhoto } from "../components/photo/PhotoEditor";
import { IconBadge, EmptyState, Field, TextInput, TextArea } from "../components/ui";

export function AddChoiceScreen({ onNewPost, onSpot }) {
  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Add to Carfooly</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>What do you want to do?</div>

      <button onClick={onNewPost} className="press" style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 18, marginBottom: 12,
        background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`,
        borderRadius: 20, boxShadow: T.shadowCard, textAlign: "left",
      }}>
        <IconBadge size={48} tone="accent"><ImageIcon size={22} color={T.accent} /></IconBadge>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>Post</div>
          <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.4 }}>Share a photo, update, or build progress on one of your cars.</div>
        </div>
        <ChevronRight size={18} color={T.textDim} />
      </button>

      <button onClick={onSpot} className="press" style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 18,
        background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`,
        borderRadius: 20, boxShadow: T.shadowCard, textAlign: "left",
      }}>
        <IconBadge size={48} tone="accent2"><MapPin size={22} color={T.accent2} /></IconBadge>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>Spot</div>
          <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.4 }}>Log a car you found in the wild, with a photo.</div>
        </div>
        <ChevronRight size={18} color={T.textDim} />
      </button>
    </div>
  );
}

export function NewPostForm({ me, cars, communities, onSubmit, onNeedCar }) {
  const carList = Object.values(cars).sort((a, b) => a.make.localeCompare(b.make));
  const joinedCommunities = Object.values(communities || {}).filter((c) => c.members.includes(me));
  const [carId, setCarId] = useState(carList[0]?.id || "");
  const [communityId, setCommunityId] = useState("");
  const [photo, setPhoto] = useState(null); const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  if (carList.length === 0) {
    return (
      <div style={{ paddingTop: 18 }}>
        <EmptyState icon={<Car size={22} color={T.textDim} />} title="No cars to post about yet" body="Add a car first, then you can post updates and photos of it." />
        <button onClick={onNeedCar} style={{ width: "100%", marginTop: 14, padding: "13px 16px", borderRadius: 16, border: "none", background: T.accent, color: T.ink, fontWeight: 600, fontSize: 15 }}>
          Add a car
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>New post</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>Shows up in the feed and stays on the car's page for good.</div>

      <Field label="Which car">
        <select value={carId} onChange={(e) => setCarId(e.target.value)}
          style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }}>
          {carList.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model} '{c.year}</option>)}
        </select>
      </Field>
      {joinedCommunities.length > 0 && (
        <Field label="Post to a community (optional)">
          <select value={communityId} onChange={(e) => setCommunityId(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }}>
            <option value="">None</option>
            {joinedCommunities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Photo (optional)">
        {photo ? (
          <div>
            <PhotoEditor photo={photo} onChange={setPhoto} />
            <button onClick={() => setPhoto(null)} className="press" style={{ marginTop: 8, background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, padding: 0 }}>
              Remove photo
            </button>
          </div>
        ) : (
          <CameraCapture value={null} onChange={(src, size) => setPhoto(newPhoto(src, size))} allowLibrary />
        )}
      </Field>
      <Field label="Caption"><TextArea value={caption} onChange={setCaption} placeholder="What's going on with it?" maxLength={280} rows={3} /></Field>

      <button disabled={busy}
        onClick={async () => {
          setBusy(true);
          const baked = photo ? await bakePhoto(photo) : null;
          await onSubmit({ carId, photoUrl: baked?.url || "", photoAspect: baked?.aspect || null, caption, communityId });
          setBusy(false);
        }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Posting…" : "Post"}

      </button>
    </div>
  );
}

export function SpotForm({ onSubmit }) {
  const [photo, setPhoto] = useState(null);
  const [make, setMake] = useState(""); const [model, setModel] = useState("");
  const [year, setYear] = useState(""); const [trim, setTrim] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = photo && make.trim() && model.trim() && year.trim();

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Log a spot</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>What did you find? A photo helps others recognize it.</div>

      <div style={{ marginBottom: 16 }}><CameraCapture value={photo} onChange={setPhoto} maxDim={1080} quality={0.72} /></div>

      <Field label="Make"><TextInput value={make} onChange={setMake} placeholder="Nissan" maxLength={30} /></Field>
      <Field label="Model"><TextInput value={model} onChange={setModel} placeholder="Skyline GT-R" maxLength={40} /></Field>
      <Field label="Year"><TextInput value={year} onChange={setYear} placeholder="1999" maxLength={4} /></Field>
      <Field label="Trim (optional)"><TextInput value={trim} onChange={setTrim} placeholder="V-Spec" maxLength={30} /></Field>

      <div style={{ fontSize: 11.5, color: T.textDim, lineHeight: 1.5, marginBottom: 14 }}>
        Spots are marked unverified until we can confirm the photo matches — that needs a backend we haven't built yet.
      </div>

      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ make, model, year, trim, photoUrl: photo }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Logging…" : "Log spot"}
      </button>
    </div>
  );
}
