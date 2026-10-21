import { useState } from "react";
import { Car, Plus, MapPin, Wrench, Check, Pencil, Gauge } from "lucide-react";
import { T } from "../theme";
import { fmtDate, hueForId, verbPhrase } from "../lib/utils";
import { Avatar, EmptyState, TextInput, Stat, SectionLabel, Section } from "../components/ui";
import { PhotoPicker } from "../components/photo/PhotoPicker";
import { MoreMenu, useSafety } from "../components/Safety";

export function CarsView({ cars, onOpen, onAdd }) {
  const list = Object.values(cars).sort((a, b) => {
    const la = a.timeline[a.timeline.length - 1]?.date || a.createdAt;
    const lb = b.timeline[b.timeline.length - 1]?.date || b.createdAt;
    return new Date(lb) - new Date(la);
  });
  return (
    <div style={{ paddingTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Cars</div>
          <div style={{ fontSize: 13.5, color: T.textDim }}>Every car in the beta, with its own page</div>
        </div>
        <button onClick={onAdd} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, padding: "8px 12px", color: T.text, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
          <Plus size={14} /> Add
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Car size={22} color={T.textDim} />} title="No cars yet" body="Add the first one." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {list.map((c) => <CarCard key={c.id} car={c} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

export function CarCard({ car, onOpen, showPrivate }) {
  const hue = hueForId(car.id);
  return (
    <button onClick={() => onOpen(car.id)} className="press" style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, overflow: "hidden", textAlign: "left", padding: 0, boxShadow: T.shadowCard }}>
      <div style={{ position: "relative", height: 96, background: car.photoUrl ? `url(${car.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${hue},35%,14%))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!car.photoUrl && <Car size={26} color="rgba(245,244,242,0.5)" />}
        {showPrivate && car.hasPage === false && (
          <span className="plate" style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.6)", color: T.textDim, fontSize: 9, padding: "3px 7px", borderRadius: 999 }}>No page</span>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{car.make} {car.model}</div>
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginTop: 3 }}>{car.year}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11, color: T.textDim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Wrench size={11} /> {car.mods.length}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={11} /> {car.spotterUsernames.length}</span>
        </div>
      </div>
    </button>
  );
}

export function SightingCard({ sighting }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 12, overflow: "hidden", boxShadow: T.shadowCard }}>
      <div style={{ height: 96, position: "relative", background: sighting.photoUrl ? `url(${sighting.photoUrl}) center/cover` : T.surface2 }}>
        <span className="plate" style={{
          position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.55)", color: T.textDim,
          fontSize: 9, padding: "3px 7px", borderRadius: 999,
        }}>
          Unverified
        </span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{sighting.make} {sighting.model}</div>
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginTop: 3 }}>{sighting.year}{sighting.trim ? ` · ${sighting.trim}` : ""}</div>
      </div>
    </div>
  );
}

// Add / edit a car. Looks like a garage card: cover photo + name up top, then a spec sheet.
export function AddCarForm({ onSubmit, initial }) {
  const editing = !!initial;
  const v = (k) => (initial && initial[k]) || "";
  const [make, setMake] = useState(v("make")); const [model, setModel] = useState(v("model"));
  const [year, setYear] = useState(v("year")); const [nickname, setNickname] = useState(v("nickname"));
  const [photoUrl, setPhotoUrl] = useState(v("photoUrl"));
  const [engine, setEngine] = useState(v("engine")); const [power, setPower] = useState(v("power"));
  const [gearbox, setGearbox] = useState(v("gearbox")); const [weight, setWeight] = useState(v("weight")); const [wheels, setWheels] = useState(v("wheels"));
  const [zeroToSixty, setZeroToSixty] = useState(v("zeroToSixty")); const [topSpeed, setTopSpeed] = useState(v("topSpeed"));
  const [note, setNote] = useState(""); const [noteDetail, setNoteDetail] = useState("");
  const [hasPage, setHasPage] = useState(editing ? initial.hasPage !== false : false);
  const [busy, setBusy] = useState(false);
  const valid = make.trim() && model.trim() && year.trim().length === 4;
  const spec = [
    ["Engine", engine, setEngine, "1.8 BP-ZE", 40], ["Power", power, setPower, "131 hp", 20],
    ["Gearbox", gearbox, setGearbox, "5-spd manual", 30], ["Weight", weight, setWeight, "990 kg", 20],
    ["0-60", zeroToSixty, setZeroToSixty, "7.2s", 15], ["Top speed", topSpeed, setTopSpeed, "120 mph", 20],
  ];

  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 14 }}>{editing ? "Edit car" : "Add to your garage"}</div>

      {/* Garage card */}
      <div data-testid="garage-card" style={{ borderRadius: 24, overflow: "hidden", border: `1px solid ${T.lineDark}`, background: T.surface, marginBottom: 14, boxShadow: T.shadowRaised }}>
        {photoUrl ? (
          <div style={{ position: "relative" }}>
            <img src={photoUrl} alt="" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", display: "block" }} />
            <button onClick={() => setPhotoUrl("")} className="glass press" style={{ position: "absolute", right: 10, top: 10, border: "none", padding: "7px 12px", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600 }}>Change photo</button>
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            <PhotoPicker onPick={(src) => setPhotoUrl(src)} aspect={16 / 10} maxDim={1440} title="Cover photo" hint="The main shot of your car (optional)" testid="car-photo" />
          </div>
        )}
        <div style={{ background: T.paper, padding: "16px 16px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 78px", gap: 8 }}>
            <div><div className="plate" style={paperLabel}>Make</div><input value={make} onChange={(e) => setMake(e.target.value)} placeholder="BMW" maxLength={30} style={paperInput} /></div>
            <div><div className="plate" style={paperLabel}>Model</div><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="M4" maxLength={40} style={paperInput} /></div>
            <div><div className="plate" style={paperLabel}>Year</div><input value={year} onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ""))} placeholder="2024" maxLength={4} inputMode="numeric" style={paperInput} /></div>
          </div>
          <div className="plate" style={{ ...paperLabel, marginTop: 10 }}>Build nickname (optional)</div>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Coilover Miata" maxLength={40} style={{ ...paperInput, fontFamily: "inherit" }} />
        </div>
      </div>

      {/* Spec sheet */}
      <Section title="Spec sheet" icon={<Gauge size={16} color={T.accent} />} hint="Fill in what you know. It shows on the car's page.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {spec.map(([label, val, set, ph, max]) => (
            <div key={label}><div className="plate" style={{ fontSize: 10, color: T.textDim, marginBottom: 6 }}>{label}</div><TextInput value={val} onChange={set} placeholder={ph} maxLength={max} /></div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}><div className="plate" style={{ fontSize: 10, color: T.textDim, marginBottom: 6 }}>Wheels</div><TextInput value={wheels} onChange={setWheels} placeholder="15x8 Watanabe" maxLength={40} /></div>
      </Section>

      {!editing && (
        <Section title="First build log entry" icon={<Wrench size={16} color={T.accentWarm} />} hint="Optional. Start the car's story.">
          <TextInput value={note} onChange={setNote} placeholder="e.g. Stage 2 tune" maxLength={60} />
          {note.trim() && <div style={{ marginTop: 10 }}><TextInput value={noteDetail} onChange={setNoteDetail} placeholder="Notes, part numbers…" maxLength={150} /></div>}
        </Section>
      )}

      <Toggle on={hasPage} onChange={setHasPage} label="Give this car its own page"
        sub={hasPage ? "Anyone can open it, follow the build and spot it." : "Off: it just sits in your garage. Only you can open it."} />

      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ make, model, year, nickname, photoUrl, engine, power, gearbox, weight, wheels, zeroToSixty, topSpeed, note, noteDetail, hasPage }); setBusy(false); }}
        style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Saving…" : editing ? "Save changes" : "Add to Carfooly"}
      </button>
    </div>
  );
}

const paperLabel = { fontSize: 9.5, color: T.inkMuted, marginBottom: 4 };
const paperInput = {
  width: "100%", padding: "9px 10px", borderRadius: 12, border: `1px solid ${T.linePaper}`, background: "#fff", color: T.ink,
  fontSize: 15, fontWeight: 700, outline: "none", fontFamily: "'IBM Plex Mono', ui-monospace, monospace", textTransform: "none",
};

export function Toggle({ on, onChange, label, sub }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="press" style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 16, borderRadius: 16,
      border: `1px solid ${on ? "rgba(230,56,70,0.5)" : T.lineDark}`, background: T.surface, textAlign: "left",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ color: T.textDim, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <div style={{ width: 46, height: 28, borderRadius: 999, background: on ? T.accent : T.surface2, position: "relative", flexShrink: 0, transition: "background .15s ease" }}>
        <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .15s ease" }} />
      </div>
    </button>
  );
}

export function CarPage({ car, me, onAddMod, onSpot, onFollowBuild, openProfile, onEdit, onTogglePage }) {
  const safety = useSafety();
  const [modName, setModName] = useState(""); const [modNote, setModNote] = useState(""); const [addingMod, setAddingMod] = useState(false);
  const isOwner = car.ownerUsername === me;
  const alreadySpotted = car.spotterUsernames.includes(me);
  const following = (car.followerUsernames || []).includes(me);
  const hue = hueForId(car.id);
  const timeline = [...car.timeline].sort((a, b) => new Date(b.date) - new Date(a.date));
  const specs = [
    ["Engine", car.engine], ["Power", car.power],
    ["Gearbox", car.gearbox], ["Weight", car.weight],
    ["Wheels", car.wheels], ["0-60", car.zeroToSixty],
    ["Top Speed", car.topSpeed], ["Owned since", fmtDate(car.createdAt)],
  ].filter(([, v]) => v);

  return (
    <div style={{ paddingBottom: 10, position: "relative" }} className="fade-in">
      {safety && (
        <div style={{ position: "absolute", right: 0, top: 12, zIndex: 5, borderRadius: 999, background: "rgba(0,0,0,0.35)" }}>
          <MoreMenu label="Car options" testid="car-menu" flash={safety.flash}
            share={{ title: "Carfooly", text: `${car.nickname || `${car.make} ${car.model}`} (${car.year}), kept by @${car.ownerUsername} on Carfooly` }}
            report={car.ownerUsername === me ? null : { what: "car", onSend: (reason, note) => safety.actions.report({ kind: "car", id: car.id, reason, note }) }} />
        </div>
      )}
      <div style={{ height: "38vh", minHeight: 280, margin: "0 -16px 0", background: car.photoUrl ? `url(${car.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${hue},35%,12%))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!car.photoUrl && <Car size={64} color="rgba(245,244,242,0.4)" />}
      </div>

      <div style={{ background: T.paper, margin: "-14px 0 0", borderRadius: "26px 26px 0 0", padding: "18px 16px 20px", position: "relative", zIndex: 2, boxShadow: "0 -4px 16px rgba(0,0,0,0.25)" }}>
        {isOwner && car.hasPage === false && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.paper2, borderRadius: 14, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ flex: 1, fontSize: 12.5, color: T.inkMuted, lineHeight: 1.4 }}>Only you can see this. It doesn't have a public page.</div>
            {onTogglePage && <button onClick={onTogglePage} className="press" style={{ border: "none", borderRadius: 999, padding: "7px 12px", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Make page</button>}
          </div>
        )}
        <div className="plate" style={{ fontSize: 11, color: T.inkMuted, marginBottom: 3 }}>{car.year} · {car.make} {car.model}</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div className="display" style={{ fontSize: 23, color: T.ink }}>{car.nickname || `${car.make} ${car.model}`}</div>
          {isOwner && onEdit && (
            <button onClick={onEdit} aria-label="Edit car" className="press" style={{ background: T.paper2, border: "none", borderRadius: 999, padding: 8, display: "flex", flexShrink: 0 }}>
              <Pencil size={15} color={T.ink} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button onClick={() => openProfile(car.ownerUsername)} style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar username={car.ownerUsername} size={26} />
            <span style={{ color: T.inkMuted, fontSize: 12.5 }}>Kept by <span style={{ color: T.accent, fontWeight: 700 }}>{car.ownerUsername}</span></span>
          </button>
          {!isOwner && (
            <button onClick={onFollowBuild} className="press" style={{
              padding: "7px 13px", borderRadius: 999, border: `1px solid ${following ? T.linePaper : T.accent}`,
              background: following ? "transparent" : T.accent, color: following ? T.inkMuted : T.ink,
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
            }}>
              {following && <Check size={11} />} {following ? "Following" : "Follow build"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.linePaper}` }}>
          <Stat label="Mods" value={car.mods.length} />
          <Stat label="Spots" value={car.spotterUsernames.length} />
          <Stat label="Followers" value={(car.followerUsernames || []).length} />
        </div>

        {!isOwner && (
          <button onClick={onSpot} disabled={alreadySpotted} className="press"
            style={{ width: "100%", marginTop: 16, padding: "12px 16px", borderRadius: 16, border: "none", background: alreadySpotted ? T.paper2 : T.accent2, color: alreadySpotted ? T.inkMuted : "#fff", fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <MapPin size={15} />{alreadySpotted ? "You spotted this" : "I spotted this"}
          </button>
        )}
      </div>

      <div style={{ padding: "20px 4px 0" }}>
        {specs.length > 0 && (
          <>
            <SectionLabel>Spec</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {specs.map(([label, val]) => (
                <div key={label} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, padding: "10px 12px", boxShadow: T.shadowCard }}>
                  <div className="plate" style={{ fontSize: 9.5, color: T.textDim, marginBottom: 3 }}>{label}</div>
                  <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <SectionLabel>Build log · {car.mods.length} {car.mods.length === 1 ? "entry" : "entries"}</SectionLabel>
        <div style={{ position: "relative", paddingLeft: 18, marginBottom: isOwner ? 14 : 4 }}>
          <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 1, background: T.lineDark }} />
          {timeline.map((t) => (
            <div key={t.id} style={{ position: "relative", marginBottom: 18 }}>
              <div style={{ position: "absolute", left: -18, top: 3, width: 9, height: 9, borderRadius: 99, background: t.type === "spot" ? T.accent2 : t.type === "mod" || t.type === "post" ? T.accent : T.textDim, border: `2px solid ${T.bg}` }} />
              <div className="plate" style={{ color: T.textDim, fontSize: 10.5, marginBottom: 2 }}>{fmtDate(t.date)}</div>
              <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.4 }}>
                <button onClick={() => openProfile(t.by)} style={{ background: "none", border: "none", padding: 0, color: T.text, fontWeight: 600, fontSize: 13.5 }}>{t.by}</button>
                {" "}{verbPhrase(t)}
              </div>
              {t.type === "mod" && t.modNote && (
                <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 3, lineHeight: 1.4 }}>{t.modNote}</div>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1 }}><TextInput value={modName} onChange={setModName} placeholder="e.g. Ohlins DFV coilovers" maxLength={60} /></div>
              <button disabled={!modName.trim() || addingMod} className="press"
                onClick={async () => { setAddingMod(true); await onAddMod(modName, modNote); setModName(""); setModNote(""); setAddingMod(false); }}
                style={{ padding: "0 16px", borderRadius: 16, border: "none", background: modName.trim() ? T.accent : T.surface2, color: modName.trim() ? T.ink : T.textDim, fontWeight: 600 }}>
                <Plus size={16} />
              </button>
            </div>
            <TextInput value={modNote} onChange={setModNote} placeholder="Details (optional) — ride height, part numbers, notes" maxLength={200} />
          </div>
        )}

        {car.spotterUsernames.length > 0 && (
          <div style={{ color: T.textDim, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <MapPin size={12} /> Spotted {car.spotterUsernames.length} {car.spotterUsernames.length === 1 ? "time" : "times"}
          </div>
        )}
      </div>
    </div>
  );
}
