import { useEffect, useState } from "react";
import { MapPin, Clock, Pencil, Trash2, Navigation, Plus, Calendar, LocateFixed, Search, Loader2, X, Award, SlidersHorizontal, FileText, Users } from "lucide-react";
import { T } from "../theme";
import { fmtWhen, isPast } from "../lib/utils";
import { useSwipe } from "../lib/useSwipe";
import { NEAR_KM, isNear, loadArea, saveArea } from "../lib/geo";
import { handleLocationError } from "../lib/permissions";
import { Avatar, EmptyState, TextInput, TextArea, ConfirmDialog, Segmented, SectionLabel, BottomSheet, Section } from "../components/ui";
import { PhotoPicker } from "../components/photo/PhotoPicker";
import { MoreMenu, useSafety } from "../components/Safety";
import { DateTimePicker } from "../components/DateTimePicker";
import { LocationPicker, LeafletMap, directionsUrl, labelFor, placeArea } from "../components/LocationPicker";
import { MAX_LINES } from "../lib/text";
import { RichText } from "../components/RichText";

export const MEET_ROLES = [
  { id: "organizer", label: "Organizing" },
  { id: "driver", label: "Driving" },
  { id: "attendee", label: "Attending" },
];

const byWhen = (a, b) => (a.when || "").localeCompare(b.when || "");

// ---------- list card ----------
export function MeetCard({ meet, onOpen }) {
  const past = isPast(meet.when);
  const going = (meet.attendees || []).length;
  return (
    <button data-testid="meet-card" onClick={() => onOpen(meet.id)} className="press" style={{
      width: "100%", display: "flex", gap: 12, alignItems: "center", marginBottom: 10, padding: 10, borderRadius: 20, textAlign: "left",
      background: T.surface, border: `1px solid ${T.lineDark}`, boxShadow: T.shadowCard, opacity: past ? 0.6 : 1,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14, flexShrink: 0,
        background: meet.cover ? `url(${meet.cover}) center/cover` : "linear-gradient(135deg, rgba(69,123,144,0.5), rgba(69,123,144,0.15))",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {!meet.cover && <Calendar size={22} color="#BFE0EC" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meet.title}</div>
        <div style={{ fontSize: 12, color: past ? T.textDim : T.accent2, display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <Clock size={11} /> {fmtWhen(meet.when)}{past ? " · Ended" : ""}
        </div>
        <div style={{ fontSize: 12, color: T.textDim, display: "flex", alignItems: "center", gap: 5, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          <MapPin size={11} style={{ flexShrink: 0 }} /> {meet.city ? `${meet.city}${meet.country ? `, ${meet.country}` : ""}` : meet.location}
        </div>
      </div>
      <div style={{ textAlign: "center", flexShrink: 0, paddingRight: 4 }}>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>{going}</div>
        <div style={{ color: T.textDim, fontSize: 10 }}>going</div>
      </div>
    </button>
  );
}

// ---------- Meets: Local / Global ----------
export function MeetsScreen({ meets, onOpen, onPost, scope = "local", setScope }) {
  const [area, setArea] = useState(undefined); // undefined = still loading
  useEffect(() => { loadArea().then(setArea); }, []);
  const sw = useSwipe({ onLeft: () => setScope("global"), onRight: () => setScope("local") });

  const all = Object.values(meets);
  const upcoming = all.filter((m) => !isPast(m.when)).sort(byWhen);
  const past = all.filter((m) => isPast(m.when)).sort(byWhen).reverse();
  const pick = async (a) => { await saveArea(a); setArea(a); };

  let body;
  if (scope === "local") {
    if (area === undefined) body = null;
    else if (!area) body = <AreaPicker onPick={pick} />;
    else {
      const near = upcoming.filter((m) => isNear(m, area));
      body = (
        <>
          <AreaBar area={area} onChange={() => setArea(null)} />
          {near.length === 0
            ? <EmptyState icon={<Calendar size={20} color={T.textDim} />} title={`No meets near ${area.city || "you"} yet`} body="Post one, or check Global to see what's on elsewhere." />
            : near.map((m) => <MeetCard key={m.id} meet={m} onOpen={onOpen} />)}
        </>
      );
    }
  } else {
    // Global: grouped by country, soonest first.
    const groups = {};
    upcoming.forEach((m) => { const k = m.country || "Other places"; (groups[k] = groups[k] || []).push(m); });
    const keys = Object.keys(groups).sort((a, b) => (a === "Other places") - (b === "Other places") || a.localeCompare(b));
    body = keys.length === 0
      ? <EmptyState icon={<Calendar size={20} color={T.textDim} />} title="No upcoming meets" body="Be the first to post one." />
      : keys.map((k) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <SectionLabel>{k}</SectionLabel>
          {groups[k].map((m) => <MeetCard key={m.id} meet={m} onOpen={onOpen} />)}
        </div>
      ));
  }

  return (
    <div {...sw.bind} style={{ ...sw.bind.style, minHeight: "70vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div className="display" style={{ fontSize: 24, color: T.text }}>Meets</div>
        <button onClick={onPost} aria-label="Post a meet" className="press" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: T.shadowAccent }}>
          <Plus size={15} /> Post a meet
        </button>
      </div>
      <Segmented testid="meet-scope" value={scope} onChange={setScope} options={[["local", "Local"], ["global", "Global"]]} />
      {body}
      {past.length > 0 && scope === "global" && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Past meets</SectionLabel>
          {past.slice(0, 10).map((m) => <MeetCard key={m.id} meet={m} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

function AreaBar({ area, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: T.textDim, fontSize: 12.5 }}>
      <MapPin size={13} color={T.accent} />
      <span style={{ flex: 1 }}>Within {NEAR_KM} km of <span style={{ color: T.text, fontWeight: 600 }}>{area.label}</span></span>
      <button onClick={onChange} className="press" style={{ background: "none", border: "none", color: T.accent, fontSize: 12.5, fontWeight: 700, padding: 0 }}>Change</button>
    </div>
  );
}

// Choose the area for "Local": your location, or a city you search for. Saved only on this phone.
function AreaPicker({ onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let off = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=5&layer=city&layer=state`);
        const j = await r.json();
        if (!off) setResults((j.features || []).map((f) => ({ label: labelFor(f.properties || {}), ...placeArea(f.properties || {}), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] })));
      } catch { if (!off) setError("City search isn't reachable right now."); }
    }, 400);
    return () => { off = true; clearTimeout(t); };
  }, [q]);

  const mine = () => {
    if (!navigator.geolocation) { setError("Location isn't available on this device."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let area = { label: "your location", city: "", country: "", lat, lng };
      try {
        const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
        const p = (await r.json()).features?.[0]?.properties;
        if (p) { const a = placeArea(p); area = { ...area, ...a, label: a.city || "your location" }; }
      } catch { /* keep "your location" */ }
      setBusy(false);
      onPick(area);
    }, (err) => { setBusy(false); handleLocationError(err); setError("Couldn't get your location. You can search for your city instead."); }, { timeout: 12000 });
  };

  return (
    <div className="glass" style={{ borderRadius: 22, padding: 16 }}>
      <div style={{ color: T.text, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>See meets near you</div>
      <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 14, lineHeight: 1.45 }}>Pick your area once. It stays on your phone and isn't shown to anyone.</div>
      <button onClick={mine} disabled={busy} className="press" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
        {busy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <LocateFixed size={15} />} Use my location
      </button>
      <TextInput value={q} onChange={setQ} placeholder="Or search your city" icon={<Search size={14} />} />
      {results.map((r, i) => (
        <button key={i} data-testid="city-result" onClick={() => onPick({ ...r, label: r.city || r.label })} style={{ width: "100%", display: "flex", gap: 8, alignItems: "center", padding: "10px 4px", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, color: T.text, fontSize: 13.5, textAlign: "left" }}>
          <MapPin size={13} color={T.accent} /> {r.label}
        </button>
      ))}
      {error && <div style={{ color: T.accent, fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  );
}

// ---------- one meet: reads like an article ----------
export function MeetDetail({ meet, me, users, onToggleGoing, onEdit, onDelete, openProfile, onSetRole, onSetCaps }) {
  const safety = useSafety();
  const [confirm, setConfirm] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);
  const [managing, setManaging] = useState(false);
  const attendees = meet.attendees || [];
  const myRole = attendees.find((a) => a.username === me)?.role;
  const isCreator = meet.submittedBy === me;
  const canManage = isCreator || myRole === "organizer";
  const past = isPast(meet.when);
  const hasPin = meet.lat != null && meet.lng != null;
  const organizers = attendees.filter((a) => a.role === "organizer");
  const caps = meet.caps || {};
  // Privacy: you only see people you know (mutual follows). Organizers are always shown.
  const mine = users[me] || { following: [] };
  const mutual = (u) => u === me || ((mine.following || []).includes(u) && (users[u]?.following || []).includes(me));
  const goingKnown = attendees.filter((a) => a.role !== "organizer" && mutual(a.username));
  const goingOthers = attendees.filter((a) => a.role !== "organizer").length - goingKnown.length;
  const section = { padding: "18px 0", borderTop: `1px solid ${T.lineDark}` };

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        {safety && (
          <MoreMenu label="Meet options" testid="meet-menu" flash={safety.flash}
            share={{ title: meet.title, text: `${meet.title} · ${fmtWhen(meet.when)} · ${meet.location} (on Carfooly)` }}
            items={isCreator ? [
              { label: "Edit meet", icon: <Pencil size={17} />, onClick: () => onEdit(meet.id) },
              { label: "Delete meet", icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
            ] : []}
            report={isCreator ? null : { what: "meet", onSend: (reason, note) => safety.actions.report({ kind: "meet", id: meet.id, reason, note }) }} />
        )}
      </div>

      {meet.cover && (
        <button onClick={() => setViewPhoto(true)} aria-label="View photo" style={{ display: "block", width: "100%", padding: 0, border: "none", borderRadius: 20, overflow: "hidden", background: T.surface, marginBottom: 18 }}>
          <img src={meet.cover} alt="" style={{ width: "100%", display: "block", maxHeight: "60vh", objectFit: "cover" }} />
        </button>
      )}

      <div className="plate" style={{ color: past ? T.textDim : T.accent2, fontSize: 11, marginBottom: 6 }}>{past ? "Ended · " : ""}{meet.city || "Meet"}{meet.country ? ` · ${meet.country}` : ""}</div>
      <div className="display" data-testid="meet-title" style={{ fontSize: 30, color: T.text, lineHeight: 1.1 }}>{meet.title}</div>
      <div style={{ color: T.text, fontSize: 14.5, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}><Clock size={15} color={T.accent2} /> {fmtWhen(meet.when)}</div>
      <div style={{ color: T.text, fontSize: 14.5, marginTop: 8, display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.4 }}><MapPin size={15} color={T.accent2} style={{ flexShrink: 0, marginTop: 2 }} /> {meet.location}</div>
      <button onClick={() => openProfile(meet.submittedBy)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, marginTop: 14 }}>
        <Avatar username={meet.submittedBy} size={26} />
        <span style={{ color: T.textDim, fontSize: 13 }}>Posted by <span style={{ color: T.text, fontWeight: 700 }}>{users[meet.submittedBy]?.name || meet.submittedBy}</span></span>
      </button>

      {/* RSVP */}
      <div style={{ display: "flex", gap: 6, margin: "18px 0" }}>
        {MEET_ROLES.map((r) => {
          const count = attendees.filter((a) => a.role === r.id).length;
          const cap = r.id === "organizer" ? null : caps[r.id];
          const on = myRole === r.id;
          const full = cap && count >= cap && !on;
          const locked = r.id === "organizer" && !canManage;
          return (
            <button key={r.id} data-testid={`rsvp-${r.id}`} disabled={full || locked} onClick={() => onToggleGoing(meet.id, r.id)} className="press" style={{
              flex: 1, padding: "10px 6px", borderRadius: 16, border: `1px solid ${on ? T.accent : T.lineDark}`,
              background: on ? "rgba(230,56,70,0.16)" : T.surface, color: on ? T.accent : T.textDim, opacity: full || locked ? 0.55 : 1,
              fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span>{r.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{count}{cap ? `/${cap}` : ""}</span>
              {full && <span style={{ fontSize: 10, color: T.accent }}>Full</span>}
            </button>
          );
        })}
      </div>

      {meet.note && (
        <div style={section}>
          <RichText text={meet.note} maxLines={MAX_LINES.note} style={{ color: T.text, fontSize: 15, lineHeight: 1.65 }} />
        </div>
      )}

      {hasPin && (
        <div style={section}>
          <SectionLabel>Where</SectionLabel>
          <div data-noswipe><LeafletMap pin={{ lat: meet.lat, lng: meet.lng }} height={180} interactive={false} /></div>
          <a href={directionsUrl(meet.lat, meet.lng)} target="_blank" rel="noopener noreferrer" className="press" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, padding: "11px", borderRadius: 14,
            background: "rgba(69,123,144,0.2)", color: "#8EC3D6", fontSize: 13.5, fontWeight: 700, textDecoration: "none",
          }}>
            <Navigation size={14} /> Directions
          </a>
        </div>
      )}

      {(meet.sponsors || []).length > 0 && (
        <div style={section}>
          <SectionLabel>Sponsors</SectionLabel>
          <div data-testid="sponsors" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {meet.sponsors.map((sp) => (
              <span key={sp} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: "rgba(242,184,75,0.14)", color: "#F2C76A", fontSize: 12.5, fontWeight: 600 }}>
                <Award size={12} /> {sp}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={section}>
        <SectionLabel>Organizing</SectionLabel>
        {organizers.map((a) => (
          <button key={a.username} onClick={() => openProfile(a.username)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "6px 0", textAlign: "left" }}>
            <Avatar username={a.username} size={32} />
            <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{users[a.username]?.name || a.username}</span>
          </button>
        ))}
      </div>

      <div style={section} data-testid="whos-going">
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}><SectionLabel>Who's going</SectionLabel></div>
          {canManage && <button onClick={() => setManaging(true)} className="press" style={{ background: "none", border: "none", color: T.accent, fontWeight: 700, fontSize: 12.5, padding: 0, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}><SlidersHorizontal size={13} /> Manage</button>}
        </div>
        {goingKnown.map((a) => (
          <button key={a.username} data-testid="going-known" onClick={() => openProfile(a.username)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "6px 0", textAlign: "left" }}>
            <Avatar username={a.username} size={30} />
            <span style={{ color: T.text, fontSize: 13.5, fontWeight: 600, flex: 1 }}>{a.username === me ? "You" : users[a.username]?.name || a.username}</span>
            <span style={{ color: T.textDim, fontSize: 12 }}>{MEET_ROLES.find((r) => r.id === a.role)?.label}</span>
          </button>
        ))}
        <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 6 }}>
          {goingOthers > 0 ? `+ ${goingOthers} ${goingOthers === 1 ? "other" : "others"} you don't follow mutually` : goingKnown.length === 0 ? "No one you know yet." : ""}
        </div>
      </div>

      {viewPhoto && (
        <div onClick={() => setViewPhoto(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={meet.cover} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
      <ManagePeople open={managing} onClose={() => setManaging(false)} meet={meet} users={users} me={me} onSetRole={onSetRole} onSetCaps={onSetCaps} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete this meet?"
        body="It will be removed for everyone. This can't be undone." onConfirm={() => onDelete(meet.id)} />
    </div>
  );
}

// Organizer tools: limits for Driving / Attending, and moving people between lists.
function ManagePeople({ open, onClose, meet, users, onSetRole, onSetCaps }) {
  const [driver, setDriver] = useState(String(meet.caps?.driver || ""));
  const [attendee, setAttendee] = useState(String(meet.caps?.attendee || ""));
  const people = meet.attendees || [];
  return (
    <BottomSheet open={open} onClose={onClose} title="Manage people" maxHeight="85vh">
      <SectionLabel>Limits (empty = no limit)</SectionLabel>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>Driving
          <input data-testid="cap-driver" inputMode="numeric" value={driver} onChange={(e) => setDriver(e.target.value.replace(/[^0-9]/g, ""))} placeholder="No limit"
            style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14 }} />
        </label>
        <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>Attending
          <input data-testid="cap-attendee" inputMode="numeric" value={attendee} onChange={(e) => setAttendee(e.target.value.replace(/[^0-9]/g, ""))} placeholder="No limit"
            style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14 }} />
        </label>
      </div>
      <button onClick={() => onSetCaps(meet.id, { driver, attendee })} className="press" style={{ width: "100%", padding: 11, borderRadius: 14, border: "none", background: T.accent, color: "#fff", fontWeight: 600, marginBottom: 18 }}>Save limits</button>

      <SectionLabel>People · {people.length}</SectionLabel>
      {people.map((a) => (
        <div key={a.username} data-testid="manage-row" style={{ padding: "10px 0", borderBottom: `1px solid ${T.lineDark}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Avatar username={a.username} size={28} />
            <span style={{ color: T.text, fontSize: 13.5, fontWeight: 600, flex: 1 }}>{users[a.username]?.name || a.username}</span>
            {a.username !== meet.submittedBy && (
              <button aria-label={`Remove ${a.username}`} onClick={() => onSetRole(meet.id, a.username, null)} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 700 }}>Remove</button>
            )}
          </div>
          {a.username === meet.submittedBy ? <div style={{ color: T.textDim, fontSize: 11.5 }}>Created the meet · always organizing</div> : (
            <div style={{ display: "flex", gap: 6 }}>
              {MEET_ROLES.map((r) => (
                <button key={r.id} data-testid={`set-${r.id}-${a.username}`} onClick={() => onSetRole(meet.id, a.username, r.id)} className="press" style={{
                  flex: 1, padding: "7px 4px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${a.role === r.id ? T.accent : T.lineDark}`, background: a.role === r.id ? "rgba(230,56,70,0.14)" : "transparent", color: a.role === r.id ? T.accent : T.textDim,
                }}>{r.label}</button>
              ))}
            </div>
          )}
        </div>
      ))}
    </BottomSheet>
  );
}

// ---------- post / edit a meet: laid out like an event ----------
export function AddMeetForm({ onSubmit, editing }) {
  const [title, setTitle] = useState(editing?.title || "");
  const [place, setPlace] = useState({ location: editing?.location || "", lat: editing?.lat ?? null, lng: editing?.lng ?? null, city: editing?.city || "", country: editing?.country || "" });
  const [when, setWhen] = useState(editing?.when || "");
  const [note, setNote] = useState(editing?.note || "");
  const [cover, setCover] = useState(editing?.cover || null);
  const [sponsors, setSponsors] = useState(editing?.sponsors || []);
  const [sponsor, setSponsor] = useState("");
  const [capDriver, setCapDriver] = useState(String(editing?.caps?.driver || ""));
  const [capAttendee, setCapAttendee] = useState(String(editing?.caps?.attendee || ""));
  const [busy, setBusy] = useState(false);
  const valid = title.trim() && place.location.trim() && when;
  const addSponsor = () => {
    const sp = sponsor.trim();
    if (sp && !sponsors.includes(sp) && sponsors.length < 8) setSponsors([...sponsors, sp]);
    setSponsor("");
  };
  const capInput = (val, set, testid) => (
    <input data-testid={testid} inputMode="numeric" value={val} onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ""))} placeholder="No limit"
      style={{ width: "100%", padding: "11px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface2, color: T.text, fontSize: 14, outline: "none" }} />
  );

  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 14 }}>{editing ? "Edit meet" : "New meet"}</div>

      {/* Cover + title, like an event poster */}
      <div style={{ marginBottom: 14 }}>
        {cover ? (
          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden" }}>
            <img src={cover} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
            <button onClick={() => setCover(null)} className="glass press" style={{ position: "absolute", right: 10, top: 10, border: "none", padding: "7px 12px", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600 }}>Change cover</button>
          </div>
        ) : (
          <PhotoPicker onPick={(src) => setCover(src)} aspect={16 / 9} maxDim={1080} quality={0.72} title="Event cover" hint="Shown at the top of the meet page (optional)" testid="meet-cover" />
        )}
        <input data-testid="meet-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your meet" maxLength={60}
          className="display" style={{ width: "100%", marginTop: 14, padding: "6px 2px", border: "none", borderBottom: `1.5px solid ${T.lineDark}`, background: "transparent", color: T.text, fontSize: 24, outline: "none" }} />
      </div>

      <Section title="When & where" icon={<Calendar size={16} color={T.accent2} />}>
        <DateTimePicker value={when} onChange={setWhen} />
        <div style={{ height: 12 }} />
        <LocationPicker value={place} onChange={setPlace} />
      </Section>

      <Section title="About" icon={<FileText size={16} color={T.accent} />} hint="Reads like the article on the meet page.">
        <TextArea value={note} onChange={setNote} placeholder="What's the plan? Route, entry, rules, food…" maxLength={500} rows={5} maxLines={MAX_LINES.note} />
      </Section>

      <Section title="Who can come" icon={<Users size={16} color={T.accentWarm} />} hint="You're on the organizing list. Leave a limit empty for no limit.">
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>Driving limit{capInput(capDriver, setCapDriver, "form-cap-driver")}</label>
          <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>Attending limit{capInput(capAttendee, setCapAttendee, "form-cap-attendee")}</label>
        </div>
      </Section>

      <Section title="Sponsors" icon={<Award size={16} color={T.accentWarm} />} hint="Optional.">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter") addSponsor(); }}>
            <TextInput value={sponsor} onChange={setSponsor} placeholder="e.g. Shine Garage" maxLength={40} />
          </div>
          <button onClick={addSponsor} aria-label="Add sponsor" disabled={!sponsor.trim()} className="press" style={{ padding: "0 16px", borderRadius: 16, border: "none", background: sponsor.trim() ? T.accent : T.surface2, color: sponsor.trim() ? "#fff" : T.textDim }}>
            <Plus size={16} />
          </button>
        </div>
        {sponsors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {sponsors.map((sp) => (
              <span key={sp} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 12px", borderRadius: 999, background: "rgba(242,184,75,0.16)", color: "#F2C76A", fontSize: 12.5, fontWeight: 600 }}>
                {sp}
                <button aria-label={`Remove ${sp}`} onClick={() => setSponsors(sponsors.filter((x) => x !== sp))} style={{ background: "none", border: "none", padding: 0, display: "flex" }}><X size={13} color="#F2C76A" /></button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ title, ...place, when, note, cover, sponsors, caps: { driver: capDriver, attendee: capAttendee } }); setBusy(false); }}
        style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? (editing ? "Saving…" : "Posting…") : (editing ? "Save changes" : "Post meet")}
      </button>
      {!valid && (
        <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", marginTop: 8 }}>
          Still needed: {[!title.trim() && "name", !when && "date & time", !place.location.trim() && "location"].filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  );
}
