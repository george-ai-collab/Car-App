import { useState } from "react";
import { Car, Plus, MapPin, Wrench, Check, Pencil, Gauge, Camera, Layers } from "lucide-react";
import { T } from "../theme";
import { fmtDate, hueForId, verbPhrase } from "../lib/utils";
import { Avatar, EmptyState, TextInput, SectionLabel, Section, Segmented } from "../components/ui";
import { useSwipe } from "../lib/useSwipe";
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

// The car's own profile. The car is the star; the owner is a small card on it.
export function CarPage({ car, me, users = {}, posts = {}, sightings = {}, onAddMod, onSpot, onFollowBuild, onFollowOwner, openProfile, openPost, onEdit, onTogglePage, tab = "posts", setTab }) {
  const safety = useSafety();
  const [modName, setModName] = useState(""); const [modNote, setModNote] = useState(""); const [addingMod, setAddingMod] = useState(false);
  const [adding, setAdding] = useState(false);
  const isOwner = car.ownerUsername === me;
  const alreadySpotted = car.spotterUsernames.includes(me);
  const following = (car.followerUsernames || []).includes(me);
  const owner = users[car.ownerUsername] || {};
  const followsOwner = (users[me]?.following || []).includes(car.ownerUsername);
  const hue = hueForId(car.id);
  const blocked = safety?.prefs.blocked || [];
  const carPosts = Object.values(posts).filter((p) => p.carId === car.id && !p.archived && !blocked.includes(p.authorUsername)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const carSightings = Object.values(sightings).filter((x) => x.matchedCarId === car.id);
  const timeline = [...car.timeline].sort((a, b) => new Date(b.date) - new Date(a.date));
  const specs = [
    ["Engine", car.engine], ["Power", car.power], ["Gearbox", car.gearbox], ["Weight", car.weight],
    ["Wheels", car.wheels], ["0-60", car.zeroToSixty], ["Top speed", car.topSpeed], ["On Carfooly since", fmtDate(car.createdAt)],
  ].filter(([, v]) => v);
  const order = ["posts", "build", "specs", "spotters"];
  const sw = useSwipe({ onLeft: () => setTab && setTab(order[Math.min(3, order.indexOf(tab) + 1)]), onRight: () => setTab && setTab(order[Math.max(0, order.indexOf(tab) - 1)]) });
  const name = car.nickname || `${car.make} ${car.model}`;

  return (
    <div data-testid="car-profile" style={{ paddingBottom: 10, position: "relative" }} className="fade-in">
      {/* Hero: the car */}
      <div style={{ position: "relative", margin: "0 -16px", aspectRatio: "4 / 3.2", maxHeight: "52vh", background: car.photoUrl ? `url(${car.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,24%), hsl(${hue},35%,10%))` }}>
        {!car.photoUrl && <Car size={70} color="rgba(245,244,242,0.35)" style={{ position: "absolute", left: "50%", top: "42%", transform: "translate(-50%,-50%)" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,11,1) 0%, rgba(10,10,11,0.55) 30%, rgba(10,10,11,0) 60%)" }} />
        {safety && (
          <div style={{ position: "absolute", right: 14, top: 14, borderRadius: 999, background: "rgba(0,0,0,0.4)" }}>
            <MoreMenu label="Car options" testid="car-menu" flash={safety.flash}
              share={{ title: "Carfooly", text: `${name} (${car.year}), kept by @${car.ownerUsername} on Carfooly` }}
              items={isOwner && onEdit ? [{ label: "Edit car", icon: <Pencil size={17} />, onClick: onEdit }] : []}
              report={isOwner ? null : { what: "car", onSend: (reason, note) => safety.actions.report({ kind: "car", id: car.id, reason, note }) }} />
          </div>
        )}
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
          <span className="plate" style={{ display: "inline-block", background: T.paper, color: T.ink, fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 6, marginBottom: 8 }}>{car.year} · {car.make} {car.model}</span>
          <div className="display" data-testid="car-name" style={{ fontSize: 32, color: "#fff", lineHeight: 1.05 }}>{name}</div>
        </div>
      </div>

      {isOwner && car.hasPage === false && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, padding: "10px 12px", margin: "12px 0 0" }}>
          <div style={{ flex: 1, fontSize: 12.5, color: T.textDim, lineHeight: 1.4 }}>Only you can see this. It doesn't have a public page.</div>
          {onTogglePage && <button onClick={onTogglePage} className="press" style={{ border: "none", borderRadius: 999, padding: "7px 12px", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Make page</button>}
        </div>
      )}

      {/* Owner: a small card */}
      <div data-testid="owner-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", margin: "12px 0", borderRadius: 18, background: T.surface, border: `1px solid ${T.lineDark}` }}>
        <button onClick={() => openProfile(car.ownerUsername)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left" }}>
          <Avatar username={car.ownerUsername} size={36} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: T.textDim, fontSize: 11 }}>Kept by</div>
            <div style={{ color: T.text, fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{owner.name || car.ownerUsername} <span className="plate" style={{ color: T.textDim, fontSize: 10.5, fontWeight: 400 }}>@{car.ownerUsername}</span></div>
          </div>
        </button>
        {!isOwner && onFollowOwner && (
          <button onClick={onFollowOwner} className="press" style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${followsOwner ? T.lineDark : T.accent}`, background: followsOwner ? "transparent" : "rgba(230,56,70,0.14)", color: followsOwner ? T.textDim : T.accent, fontSize: 12, fontWeight: 700 }}>
            {followsOwner ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* Dash: the numbers, like gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        {[["Followers", (car.followerUsernames || []).length], ["Spots", car.spotterUsernames.length], ["Posts", carPosts.length], ["Mods", car.mods.length]].map(([l, v]) => (
          <div key={l} style={{ textAlign: "center", padding: "10px 4px", borderRadius: 16, background: "radial-gradient(100% 120% at 50% 0%, rgba(230,56,70,0.12), transparent 70%), " + T.surface, border: `1px solid ${T.lineDark}` }}>
            <div className="plate" style={{ color: T.text, fontSize: 19, fontWeight: 700 }}>{v}</div>
            <div style={{ color: T.textDim, fontSize: 10.5, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {isOwner ? (
          <>
            {onEdit && <button onClick={onEdit} aria-label="Edit car" className="press" style={actBtn(false)}><Pencil size={15} /> Edit car</button>}
            <button onClick={() => { setTab && setTab("build"); setAdding(true); }} className="press" style={actBtn(true)}><Wrench size={15} /> Log a mod</button>
          </>
        ) : (
          <>
            <button onClick={onFollowBuild} className="press" style={actBtn(!following)}>{following ? <Check size={15} /> : <Plus size={15} />} {following ? "Following build" : "Follow build"}</button>
            <button onClick={onSpot} disabled={alreadySpotted} className="press" style={{ ...actBtn(false), color: alreadySpotted ? T.textDim : "#8EC3D6" }}><MapPin size={15} /> {alreadySpotted ? "Spotted" : "I spotted this"}</button>
          </>
        )}
      </div>

      <div {...sw.bind} style={{ ...sw.bind.style, minHeight: "40vh" }}>
        <Segmented testid="car-tabs" value={tab} onChange={(t) => setTab && setTab(t)} options={[["posts", "Posts"], ["build", "Build"], ["specs", "Specs"], ["spotters", "Spotted"]]} />

        {tab === "posts" && (
          carPosts.length === 0
            ? <EmptyState icon={<Camera size={20} color={T.textDim} />} title="No posts yet" body={isOwner ? "Post a photo and tag this car." : "Posts tagged with this car show up here."} />
            : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {carPosts.map((p) => (
                  <button key={p.id} data-testid="car-post" onClick={() => openPost && openPost(p.id)} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "none", padding: 0, background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : T.surface }}>
                    {!p.photoUrl && <span style={{ color: T.text, fontSize: 11, padding: 8, display: "block" }}>{p.caption}</span>}
                    {(p.photos || []).length > 1 && <Layers size={13} color="#fff" style={{ position: "absolute", top: 6, right: 6 }} />}
                  </button>
                ))}
              </div>
            )
        )}

        {tab === "build" && (
          <>
            {isOwner && (adding ? (
              <div className="fade-in" style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 18, padding: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}><TextInput value={modName} onChange={setModName} placeholder="e.g. Ohlins DFV coilovers" maxLength={60} autoFocus /></div>
                  <button disabled={!modName.trim() || addingMod} className="press" aria-label="Save mod"
                    onClick={async () => { setAddingMod(true); await onAddMod(modName, modNote); setModName(""); setModNote(""); setAddingMod(false); setAdding(false); }}
                    style={{ padding: "0 16px", borderRadius: 16, border: "none", background: modName.trim() ? T.accent : T.surface2, color: modName.trim() ? "#fff" : T.textDim, fontWeight: 600 }}>
                    <Check size={16} />
                  </button>
                </div>
                <TextInput value={modNote} onChange={setModNote} placeholder="Details (optional): ride height, part numbers, notes" maxLength={200} />
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="press" style={{ width: "100%", marginBottom: 16, padding: "11px", borderRadius: 16, border: `1px dashed ${T.lineDark}`, background: T.surface, color: T.text, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={14} /> Log a mod</button>
            ))}
            <div style={{ position: "relative", paddingLeft: 18 }}>
              <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 1, background: T.lineDark }} />
              {timeline.map((t) => (
                <div key={t.id} style={{ position: "relative", marginBottom: 18 }}>
                  <div style={{ position: "absolute", left: -18, top: 3, width: 9, height: 9, borderRadius: 99, background: t.type === "spot" ? T.accent2 : t.type === "mod" || t.type === "post" ? T.accent : T.textDim, border: `2px solid ${T.bg}` }} />
                  <div className="plate" style={{ color: T.textDim, fontSize: 10.5, marginBottom: 2 }}>{fmtDate(t.date)}</div>
                  <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.4 }}>
                    <button onClick={() => openProfile(t.by)} style={{ background: "none", border: "none", padding: 0, color: T.text, fontWeight: 600, fontSize: 13.5 }}>{t.by}</button>
                    {" "}{verbPhrase(t)}
                  </div>
                  {t.type === "mod" && t.modNote && <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 3, lineHeight: 1.4 }}>{t.modNote}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "specs" && (
          specs.length === 0
            ? <EmptyState icon={<Gauge size={20} color={T.textDim} />} title="No specs yet" body={isOwner ? "Add them with Edit car." : "The owner hasn't added specs yet."} />
            : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {specs.map(([label, val]) => (
                  <div key={label} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, padding: "12px" }}>
                    <div className="plate" style={{ fontSize: 9.5, color: T.textDim, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>{val}</div>
                  </div>
                ))}
              </div>
            )
        )}

        {tab === "spotters" && (
          car.spotterUsernames.length === 0
            ? <EmptyState icon={<MapPin size={20} color={T.textDim} />} title="Not spotted yet" body="When someone spots this car in the wild, they show up here." />
            : (
              <>
                {carSightings.filter((x) => x.photoUrl).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
                    {carSightings.filter((x) => x.photoUrl).map((x) => <div key={x.id} style={{ aspectRatio: "1", borderRadius: 12, background: `url(${x.photoUrl}) center/cover` }} />)}
                  </div>
                )}
                {car.spotterUsernames.map((u) => (
                  <button key={u} onClick={() => openProfile(u)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 0", background: "none", border: "none", textAlign: "left" }}>
                    <Avatar username={u} size={32} />
                    <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{users[u]?.name || u}</span>
                    <span className="plate" style={{ color: T.textDim, fontSize: 10.5 }}>@{u}</span>
                  </button>
                ))}
              </>
            )
        )}
      </div>
    </div>
  );
}

const actBtn = (primary) => ({
  flex: 1, padding: "11px 10px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13.5, fontWeight: 700,
  border: primary ? "none" : `1px solid ${T.lineDark}`, background: primary ? T.accent : T.surface, color: primary ? "#fff" : T.text, boxShadow: primary ? T.shadowAccent : "none",
});
