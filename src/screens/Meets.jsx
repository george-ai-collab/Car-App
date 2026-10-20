import { useEffect, useState } from "react";
import { MapPin, Clock, Pencil, Trash2, Navigation, Plus, Calendar, LocateFixed, Search, Loader2, X, Award } from "lucide-react";
import { T } from "../theme";
import { fmtWhen, isPast } from "../lib/utils";
import { useSwipe } from "../lib/useSwipe";
import { NEAR_KM, isNear, loadArea, saveArea } from "../lib/geo";
import { Avatar, EmptyState, Field, TextInput, TextArea, ConfirmDialog, Segmented, SectionLabel } from "../components/ui";
import { DateTimePicker } from "../components/DateTimePicker";
import { LocationPicker, LeafletMap, directionsUrl, labelFor, placeArea } from "../components/LocationPicker";
import { CameraCapture } from "../components/photo/CameraCapture";

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
    }, () => { setBusy(false); setError("Couldn't get your location. You can search for your city instead."); }, { timeout: 12000 });
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

// ---------- one meet ----------
export function MeetDetail({ meet, me, users, onToggleGoing, onEdit, onDelete, openProfile }) {
  const [confirm, setConfirm] = useState(false);
  const attendees = meet.attendees || [];
  const myRole = attendees.find((a) => a.username === me)?.role;
  const isMine = meet.submittedBy === me;
  const past = isPast(meet.when);
  const hasPin = meet.lat != null && meet.lng != null;
  const organizer = users[meet.submittedBy] || {};
  const card = { borderRadius: 22, padding: 16, marginBottom: 12 };

  return (
    <div style={{ position: "relative", paddingTop: 4 }}>
      {/* The organizer's photo sits behind everything, blurred, so the page reads like looking through glass. */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: meet.cover ? `url(${meet.cover}) center/cover` : "radial-gradient(120% 70% at 50% 0%, rgba(69,123,144,0.55), rgba(10,10,11,1) 70%)",
        filter: meet.cover ? "blur(18px) brightness(0.5) saturate(1.2)" : "none", transform: "scale(1.15)",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "24px 4px 18px" }}>
          {past && <div className="plate" style={{ display: "inline-block", fontSize: 10, color: T.textDim, background: "rgba(0,0,0,0.4)", padding: "4px 9px", borderRadius: 999, marginBottom: 10 }}>Ended</div>}
          <div className="display" data-testid="meet-title" style={{ fontSize: 30, color: "#fff", lineHeight: 1.1, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{meet.title}</div>
          <div style={{ color: "#fff", fontSize: 14, marginTop: 10, display: "flex", alignItems: "center", gap: 7, opacity: 0.9 }}><Clock size={14} /> {fmtWhen(meet.when)}</div>
          <div style={{ color: "#fff", fontSize: 14, marginTop: 6, display: "flex", alignItems: "flex-start", gap: 7, opacity: 0.9, lineHeight: 1.35 }}><MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {meet.location}</div>
        </div>

        {/* RSVP */}
        <div className="glass" style={card}>
          <div style={{ display: "flex", gap: 6 }}>
            {MEET_ROLES.map((r) => {
              const count = attendees.filter((a) => a.role === r.id).length;
              const mine = myRole === r.id;
              return (
                <button key={r.id} onClick={() => onToggleGoing(meet.id, r.id)} className="press" style={{
                  flex: 1, padding: "10px 6px", borderRadius: 16, border: `1px solid ${mine ? T.accent : "rgba(255,255,255,0.14)"}`,
                  background: mine ? "rgba(230,56,70,0.22)" : "rgba(255,255,255,0.04)", color: mine ? "#fff" : T.textDim,
                  fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <span>{r.label}</span><span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Where */}
        {hasPin && (
          <div className="glass" style={{ ...card, padding: 10 }}>
            <div data-noswipe><LeafletMap pin={{ lat: meet.lat, lng: meet.lng }} height={170} interactive={false} /></div>
            <a href={directionsUrl(meet.lat, meet.lng)} target="_blank" rel="noopener noreferrer" className="press" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, padding: "11px", borderRadius: 14,
              background: "rgba(69,123,144,0.28)", color: "#CFEAF4", fontSize: 13.5, fontWeight: 700, textDecoration: "none",
            }}>
              <Navigation size={14} /> Directions
            </a>
          </div>
        )}

        {/* About */}
        {meet.note && (
          <div className="glass" style={card}>
            <SectionLabel>About</SectionLabel>
            <div style={{ color: T.text, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{meet.note}</div>
          </div>
        )}

        {/* Organizer + sponsors */}
        <div className="glass" style={card}>
          <SectionLabel>Organized by</SectionLabel>
          <button onClick={() => openProfile(meet.submittedBy)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, textAlign: "left" }}>
            <Avatar username={meet.submittedBy} size={38} />
            <div>
              <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>{organizer.name || meet.submittedBy}</div>
              <div className="plate" style={{ color: T.textDim, fontSize: 10.5 }}>@{meet.submittedBy}</div>
            </div>
          </button>
          {(meet.sponsors || []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionLabel>Sponsors</SectionLabel>
              <div data-testid="sponsors" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {meet.sponsors.map((s) => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: "rgba(242,184,75,0.16)", color: "#F7D58E", fontSize: 12.5, fontWeight: 600 }}>
                    <Award size={12} /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Who's going */}
        <div className="glass" style={card}>
          <SectionLabel>Who's going · {attendees.length}</SectionLabel>
          {attendees.length === 0 ? <div style={{ color: T.textDim, fontSize: 13 }}>No one yet.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {attendees.map((a) => (
                <button key={a.username} onClick={() => openProfile(a.username)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, textAlign: "left" }}>
                  <Avatar username={a.username} size={30} />
                  <span style={{ color: T.text, fontSize: 13.5, fontWeight: 600, flex: 1 }}>{users[a.username]?.name || a.username}</span>
                  <span style={{ color: T.textDim, fontSize: 12 }}>{MEET_ROLES.find((r) => r.id === a.role)?.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {isMine && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button onClick={() => onEdit(meet.id)} aria-label="Edit meet" className="glass press" style={{ flex: 1, padding: 12, borderRadius: 16, color: T.text, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => setConfirm(true)} aria-label="Delete meet" className="glass press" style={{ flex: 1, padding: 12, borderRadius: 16, color: T.accent, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete this meet?"
        body="It will be removed for everyone. This can't be undone." onConfirm={() => onDelete(meet.id)} />
    </div>
  );
}

// ---------- post / edit a meet ----------
export function AddMeetForm({ onSubmit, editing }) {
  const [title, setTitle] = useState(editing?.title || "");
  const [place, setPlace] = useState({ location: editing?.location || "", lat: editing?.lat ?? null, lng: editing?.lng ?? null, city: editing?.city || "", country: editing?.country || "" });
  const [when, setWhen] = useState(editing?.when || "");
  const [note, setNote] = useState(editing?.note || "");
  const [cover, setCover] = useState(editing?.cover || null);
  const [sponsors, setSponsors] = useState(editing?.sponsors || []);
  const [sponsor, setSponsor] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = title.trim() && place.location.trim() && when;
  const addSponsor = () => {
    const s = sponsor.trim();
    if (s && !sponsors.includes(s) && sponsors.length < 8) setSponsors([...sponsors, s]);
    setSponsor("");
  };
  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>{editing ? "Edit meet" : "Post a meet"}</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>{editing ? "Update the details." : "Let people know what, where and when."}</div>
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="e.g. Friday night cars & coffee" maxLength={60} /></Field>
      <Field label="When"><DateTimePicker value={when} onChange={setWhen} /></Field>
      <Field label="Where"><LocationPicker value={place} onChange={setPlace} /></Field>
      <Field label="Cover photo (shown behind the meet page)">
        <CameraCapture value={cover} onChange={(src) => setCover(src)} allowLibrary maxDim={1080} quality={0.72} label="Add a cover photo" />
        {cover && <button onClick={() => setCover(null)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12.5, padding: "8px 0 0" }}>Remove photo</button>}
      </Field>
      <Field label="About (optional)"><TextArea value={note} onChange={setNote} placeholder="What's the plan? Route, entry, rules, food…" maxLength={500} rows={4} /></Field>
      <Field label="Sponsors (optional)">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter") addSponsor(); }}>
            <TextInput value={sponsor} onChange={setSponsor} placeholder="e.g. Al-Futtaim Detailing" maxLength={40} />
          </div>
          <button onClick={addSponsor} aria-label="Add sponsor" disabled={!sponsor.trim()} className="press" style={{ padding: "0 16px", borderRadius: 16, border: "none", background: sponsor.trim() ? T.accent : T.surface2, color: sponsor.trim() ? "#fff" : T.textDim }}>
            <Plus size={16} />
          </button>
        </div>
        {sponsors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {sponsors.map((s) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 12px", borderRadius: 999, background: "rgba(242,184,75,0.16)", color: "#F7D58E", fontSize: 12.5, fontWeight: 600 }}>
                {s}
                <button aria-label={`Remove ${s}`} onClick={() => setSponsors(sponsors.filter((x) => x !== s))} style={{ background: "none", border: "none", padding: 0, display: "flex" }}><X size={13} color="#F7D58E" /></button>
              </span>
            ))}
          </div>
        )}
      </Field>
      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ title, ...place, when, note, cover, sponsors }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? (editing ? "Saving…" : "Posting…") : (editing ? "Save changes" : "Post meet")}
      </button>
      {!valid && (
        <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", marginTop: 8 }}>
          Still needed: {[!title.trim() && "title", !when && "date & time", !place.location.trim() && "location"].filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  );
}

