import { useState } from "react";
import { Car, MapPin, Image as ImageIcon, ChevronRight, SlidersHorizontal, Tag, Search } from "lucide-react";
import { T } from "../theme";
import { PhotoEditor, bakePhoto, newPhoto } from "../components/photo/PhotoEditor";
import { IconBadge, TextInput, TextArea, Section, ChipPicker } from "../components/ui";
import { PhotoPicker } from "../components/photo/PhotoPicker";

export function AddChoiceScreen({ onNewPost, onSpot, onAddCar }) {
  return (
    <div>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 4 }}>Add to Carfooly</div>
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
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 18, marginBottom: 12,
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

      {onAddCar && (
        <button onClick={onAddCar} className="press" style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 18,
          background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`,
          borderRadius: 20, boxShadow: T.shadowCard, textAlign: "left",
        }}>
          <IconBadge size={48} tone="warm"><Car size={22} color={T.accentWarm} /></IconBadge>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>Add a car</div>
            <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.4 }}>Put one of your cars in your garage.</div>
          </div>
          <ChevronRight size={18} color={T.textDim} />
        </button>
      )}
    </div>
  );
}

// New post: the photo is the star. Editing tools sit under it, then the details.
export function NewPostForm({ me, cars, communities, onSubmit, initialCommunityId }) {
  const byName = (a, b) => a.make.localeCompare(b.make);
  const myCars = Object.values(cars).filter((c) => c.ownerUsername === me).sort(byName);
  const spotted = Object.values(cars).filter((c) => c.ownerUsername !== me && c.hasPage !== false && c.spotterUsernames.includes(me)).sort(byName);
  const joinedCommunities = Object.values(communities || {}).filter((c) => c.members.includes(me) || c.id === initialCommunityId);
  const [carId, setCarId] = useState(myCars[0]?.id || (spotted[0] ? spotted[0].id : "other"));
  const [carLabel, setCarLabel] = useState("");
  const [communityId, setCommunityId] = useState(initialCommunityId || "");
  const [photo, setPhoto] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const canPost = (photo || caption.trim()) && !busy;

  const carOptions = [
    ...myCars.map((c) => ({ id: c.id, label: c.nickname || `${c.make} ${c.model}`, sub: `Your car · '${c.year}` })),
    ...spotted.map((c) => ({ id: c.id, label: `${c.make} ${c.model}`, sub: `Spotted · @${c.ownerUsername}` })),
    { id: "other", label: "Another car", sub: "Type what it is" },
    { id: "none", label: "No car tag", sub: "Just the photo" },
  ];
  const submit = async () => {
    setBusy(true);
    const baked = photo ? await bakePhoto(photo) : null;
    const real = carId !== "other" && carId !== "none" ? carId : null;
    await onSubmit({ carId: real, carLabel: carId === "other" ? carLabel : "", photoUrl: baked?.url || "", photoAspect: baked?.aspect || null, caption, communityId });
    setBusy(false);
  };

  return (
    <div style={{ paddingBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div className="display" style={{ fontSize: 24, color: T.text, flex: 1 }}>New post</div>
        <button disabled={!canPost} onClick={submit} className="press" style={{
          padding: "9px 20px", borderRadius: 999, border: "none", fontWeight: 700, fontSize: 14,
          background: canPost ? T.accent : T.surface2, color: canPost ? "#fff" : T.textDim, boxShadow: canPost ? T.shadowAccent : "none",
        }}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>

      {/* 1. The photo */}
      {photo ? (
        <Section title="Edit photo" icon={<SlidersHorizontal size={16} color={T.accent} />}
          right={<button onClick={() => setPhoto(null)} className="press" style={{ background: "none", border: "none", color: T.textDim, fontSize: 12.5, fontWeight: 600, padding: 0 }}>Remove</button>}>
          <PhotoEditor photo={photo} onChange={setPhoto} />
        </Section>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <PhotoPicker onPick={(src, size) => setPhoto(newPhoto(src, size))} title="Add a photo" hint="Portrait, square or landscape. You can crop and cover plates next." />
        </div>
      )}

      {/* 2. The details */}
      <Section title="Details" icon={<Tag size={16} color={T.accent2} />} testid="post-details">
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 8 }}>Which car</div>
        <ChipPicker testid="car-chips" value={carId} onChange={setCarId} options={carOptions} />
        {carId === "other" && (
          <div style={{ marginTop: 10 }}><TextInput value={carLabel} onChange={setCarLabel} placeholder="e.g. Porsche 911 GT3 RS" maxLength={50} /></div>
        )}
        {joinedCommunities.length > 0 && (
          <>
            <div className="plate" style={{ fontSize: 10.5, color: T.textDim, margin: "16px 0 8px" }}>Community (optional)</div>
            <ChipPicker testid="community-chips" value={communityId} onChange={setCommunityId}
              options={[{ id: "", label: "None" }, ...joinedCommunities.map((c) => ({ id: c.id, label: c.name }))]} />
          </>
        )}
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, margin: "16px 0 8px" }}>Caption</div>
        <TextArea value={caption} onChange={setCaption} placeholder="What's going on with it?" maxLength={280} rows={3} />
      </Section>
    </div>
  );
}

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
      <div className="display" style={{ fontSize: 24, color: T.text }}>Spot a car</div>
      <div style={{ fontSize: 13, color: T.textDim, marginBottom: 14 }}>Saw something good? Snap it and log it.</div>

      {photo ? (
        <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", marginBottom: 14 }}>
          <img src={photo} alt="" style={{ width: "100%", maxHeight: "50vh", objectFit: "cover", display: "block" }} />
          <button onClick={() => setPhoto(null)} className="glass press" style={{ position: "absolute", right: 12, bottom: 12, border: "none", padding: "8px 14px", borderRadius: 999, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>Retake</button>
          <span className="plate" style={{ position: "absolute", left: 12, top: 12, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, padding: "4px 9px", borderRadius: 999 }}>Spotted</span>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <PhotoPicker testid="spot-picker" onPick={(src) => setPhoto(src)} aspect={3 / 4} maxDim={1080} quality={0.72} title="Point and shoot" hint="Get the whole car in frame.">
            <div style={corner({ top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 })} />
            <div style={corner({ top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 })} />
            <div style={corner({ bottom: 84, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 })} />
            <div style={corner({ bottom: 84, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 })} />
          </PhotoPicker>
        </div>
      )}

      <Section title="What is it?" icon={<Search size={16} color={T.accent2} />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><div className="plate" style={miniLabel}>Make</div><TextInput value={make} onChange={setMake} placeholder="Nissan" maxLength={30} /></div>
          <div><div className="plate" style={miniLabel}>Model</div><TextInput value={model} onChange={setModel} placeholder="Skyline GT-R" maxLength={40} /></div>
          <div><div className="plate" style={miniLabel}>Year</div><TextInput value={year} onChange={(v) => setYear(v.replace(/[^0-9]/g, ""))} placeholder="1999" maxLength={4} /></div>
          <div><div className="plate" style={miniLabel}>Trim (optional)</div><TextInput value={trim} onChange={setTrim} placeholder="V-Spec" maxLength={30} /></div>
        </div>
        <div style={{ fontSize: 11.5, color: T.textDim, lineHeight: 1.5, marginTop: 12 }}>
          If it matches a car with a page, the owner gets a "spotted" notification. Spots are marked unverified for now.
        </div>
      </Section>

      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ make, model, year, trim, photoUrl: photo }); setBusy(false); }}
        style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: valid ? T.accent2 : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15, opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <MapPin size={16} /> {busy ? "Logging…" : "Log spot"}
      </button>
    </div>
  );
}

const miniLabel = { fontSize: 10, color: T.textDim, marginBottom: 6 };
