import { useEffect, useState } from "react";
import { MapPin, Clock, Pencil, Trash2, Navigation, Plus, Calendar, LocateFixed, Search, Loader2, X, Award, SlidersHorizontal, FileText, Users, BadgeCheck, Repeat, Info, ShieldCheck } from "lucide-react";
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
import { meetStatus, occurrence, groupMeets, toLocal, hoursBetween } from "../lib/meets";
import { OrganizerTools, DriverCard, Announcements, CarsAtMeet } from "./MeetDay";
import { nextWeekSlot } from "../lib/meetInsights";
import { tr, locale } from "../lib/i18n";

export const MEET_ROLES = [
  { id: "organizer", label: tr("Organizing") },
  { id: "driver", label: tr("Driving") },
  { id: "attendee", label: tr("Attending") },
];

const fmtTime = (d) => d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });

// ---------- list card ----------
export function MeetCard({ meet, onOpen }) {
  const status = meetStatus(meet);
  const past = status === "ended";
  const { start, end } = occurrence(meet);
  const going = (meet.attendees || []).length;
  return (
    <button data-testid="meet-card" onClick={() => onOpen(meet.id)} className="press" style={{
      width: "100%", display: "flex", gap: 12, alignItems: "center", marginBottom: 10, padding: 10, borderRadius: 20, textAlign: "start",
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: T.text, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meet.title}</span>
        </div>
        <div style={{ fontSize: 12, color: status === "live" ? "#7BD389" : past ? T.textDim : T.accent2, display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          {status === "live" ? <><span data-testid="live-dot" style={{ width: 7, height: 7, borderRadius: 99, background: "#7BD389" }} /> {tr("Happening now · until")} {end ? fmtTime(end) : ""}</>
            : <><Clock size={11} /> {start ? fmtWhen(toLocal(start)) : fmtWhen(meet.when)}{meet.recurring === "weekly" ? tr(" · weekly") : ""}{past ? tr(" · Ended") : ""}</>}
        </div>
        {meet.featured && !past && <div style={{ fontSize: 10.5, color: "#F2C76A", fontWeight: 700, marginTop: 2 }}>{tr("FEATURED")}</div>}
        <div style={{ fontSize: 12, color: T.textDim, display: "flex", alignItems: "center", gap: 5, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          <MapPin size={11} style={{ flexShrink: 0 }} /> {meet.city ? `${meet.city}${meet.country ? `, ${meet.country}` : ""}` : meet.location}
        </div>
      </div>
      <div style={{ textAlign: "center", flexShrink: 0, paddingInlineEnd: 4 }}>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>{going}</div>
        <div style={{ color: T.textDim, fontSize: 10 }}>{tr("going")}</div>
      </div>
    </button>
  );
}

// ---------- Meets: Local / Global ----------
export function MeetsScreen({ meets, onOpen, onPost, scope = "local", setScope }) {
  const [area, setArea] = useState(undefined); // undefined = still loading
  useEffect(() => { loadArea().then(setArea); }, []);
  const sw = useSwipe({ onLeft: () => setScope("global"), onRight: () => setScope("local") });

  const safety = useSafety();
  const opts = { me: safety?.me, users: safety?.users || {} };
  const pick = async (a) => { await saveArea(a); setArea(a); };

  let body;
  if (scope === "local") {
    if (area === undefined) body = null;
    else if (!area) body = <AreaPicker onPick={pick} />;
    else {
      const near = {};
      Object.values(meets).filter((m) => isNear(m, area)).forEach((m) => { near[m.id] = m; });
      const groups = groupMeets(near, opts);
      body = (
        <>
          <AreaBar area={area} onChange={() => setArea(null)} />
          {groups.filter((g) => g.id !== "recent").length === 0 && <EmptyState icon={<Calendar size={20} color={T.textDim} />} title={tr("No meets near {0} yet", area.city || tr("you"))} body={tr("Post one, or check Global to see what's on elsewhere.")} />}
          <MeetGroups groups={groups} onOpen={onOpen} />
        </>
      );
    }
  } else {
    // Global: everywhere, grouped by when (the card shows the city and country).
    const groups = groupMeets(meets, opts);
    body = (
      <>
        {groups.filter((g) => g.id !== "recent").length === 0 && <EmptyState icon={<Calendar size={20} color={T.textDim} />} title={tr("No upcoming meets")} body={tr("Be the first to post one.")} />}
        <MeetGroups groups={groups} onOpen={onOpen} />
      </>
    );
  }

  return (
    <div {...sw.bind} style={{ ...sw.bind.style, minHeight: "70vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div className="display" style={{ fontSize: 24, color: T.text }}>{tr("Meets")}</div>
        <button onClick={onPost} aria-label={tr("Post a meet")} className="press" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: T.shadowAccent }}>
          <Plus size={15} /> {tr("Post a meet")}
        </button>
      </div>
      <Segmented testid="meet-scope" value={scope} onChange={setScope} options={[["local", tr("Local")], ["global", tr("Global")]]} />
      {body}
    </div>
  );
}

// Happening now / Today / This weekend / This week / Later / Recently ended (7 days).
function MeetGroups({ groups, onOpen }) {
  return groups.map((g) => (
    <div key={g.id} data-testid={`meet-group-${g.id}`} style={{ marginBottom: 8 }}>
      <SectionLabel>{g.label}</SectionLabel>
      {g.meets.map((m) => <MeetCard key={m.id} meet={m} onOpen={onOpen} />)}
    </div>
  ));
}

function AreaBar({ area, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: T.textDim, fontSize: 12.5 }}>
      <MapPin size={13} color={T.accent} />
      <span style={{ flex: 1 }}>{tr("Within")} {NEAR_KM} {tr("km of")} <span style={{ color: T.text, fontWeight: 600 }}>{area.label}</span></span>
      <button onClick={onChange} className="press" style={{ background: "none", border: "none", color: T.accent, fontSize: 12.5, fontWeight: 700, padding: 0 }}>{tr("Change")}</button>
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
      } catch { if (!off) setError(tr("City search isn't reachable right now.")); }
    }, 400);
    return () => { off = true; clearTimeout(t); };
  }, [q]);

  const mine = () => {
    if (!navigator.geolocation) { setError(tr("Location isn't available on this device.")); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let area = { label: tr("your location"), city: "", country: "", lat, lng };
      try {
        const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
        const p = (await r.json()).features?.[0]?.properties;
        if (p) { const a = placeArea(p); area = { ...area, ...a, label: a.city || tr("your location") }; }
      } catch { /* keep "your location" */ }
      setBusy(false);
      onPick(area);
    }, (err) => { setBusy(false); handleLocationError(err); setError(tr("Couldn't get your location. You can search for your city instead.")); }, { timeout: 12000 });
  };

  return (
    <div className="glass" style={{ borderRadius: 22, padding: 16 }}>
      <div style={{ color: T.text, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{tr("See meets near you")}</div>
      <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 14, lineHeight: 1.45 }}>{tr("Pick your area once. It stays on your phone and isn't shown to anyone.")}</div>
      <button onClick={mine} disabled={busy} className="press" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
        {busy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <LocateFixed size={15} />} {tr("Use my location")}
      </button>
      <TextInput value={q} onChange={setQ} placeholder={tr("Or search your city")} icon={<Search size={14} />} />
      {results.map((r, i) => (
        <button key={i} data-testid="city-result" onClick={() => onPick({ ...r, label: r.city || r.label })} style={{ width: "100%", display: "flex", gap: 8, alignItems: "center", padding: "10px 4px", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, color: T.text, fontSize: 13.5, textAlign: "start" }}>
          <MapPin size={13} color={T.accent} /> {r.label}
        </button>
      ))}
      {error && <div style={{ color: T.accent, fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  );
}

// ---------- one meet: reads like an article ----------
export function MeetDetail({ meet, me, users, onToggleGoing, onEdit, onDelete, openProfile, onSetRole, onSetCaps, onInsights, onRepeat, source = "other" }) {
  const safety = useSafety();
  const [confirm, setConfirm] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);
  const [managing, setManaging] = useState(false);
  const [agreeFor, setAgreeFor] = useState(null); // role waiting for "I agree to the rules"
  const attendees = meet.attendees || [];
  const myRole = attendees.find((a) => a.username === me)?.role;
  const isCreator = meet.submittedBy === me;
  const canManage = isCreator || myRole === "organizer";
  const status = meetStatus(meet);
  const past = status === "ended";
  const { start, end } = occurrence(meet);
  useEffect(() => { safety?.actions.viewMeet?.(meet.id, source); }, [meet.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
          <MoreMenu label={tr("Meet options")} testid="meet-menu" flash={safety.flash}
            share={{ title: meet.title, text: tr("{0} · {1} · {2} (on Carfooly)", meet.title, fmtWhen(meet.when), meet.location) }}
            items={isCreator ? [
              { label: tr("Edit meet"), icon: <Pencil size={17} />, onClick: () => onEdit(meet.id) },
              { label: tr("Delete meet"), icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
            ] : []}
            report={isCreator ? null : { what: "meet", onSend: (reason, note) => safety.actions.report({ kind: "meet", id: meet.id, reason, note }) }} />
        )}
      </div>

      {meet.cover && (
        <button onClick={() => setViewPhoto(true)} aria-label={tr("View photo")} style={{ display: "block", width: "100%", padding: 0, border: "none", borderRadius: 20, overflow: "hidden", background: T.surface, marginBottom: 18 }}>
          <img src={meet.cover} alt="" style={{ width: "100%", display: "block", maxHeight: "60vh", objectFit: "cover" }} />
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span className="plate" data-testid="meet-status" style={{ color: status === "live" ? "#7BD389" : past ? T.textDim : T.accent2, fontSize: 11 }}>
          {status === "live" ? tr("Happening now · ") : past ? tr("Ended · ") : ""}{meet.city || tr("Meet")}{meet.country ? ` · ${meet.country}` : ""}
        </span>
        {users[meet.submittedBy]?.verified && <span style={{ color: "#8EC3D6", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><BadgeCheck size={12} /> {tr("Verified club")}</span>}
      </div>
      <div className="display" data-testid="meet-title" style={{ fontSize: 30, color: T.text, lineHeight: 1.1 }}>{meet.title}</div>
      <div data-testid="meet-when" style={{ color: T.text, fontSize: 14.5, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Clock size={15} color={T.accent2} /> {start ? fmtWhen(toLocal(start)) : fmtWhen(meet.when)}{end ? ` – ${fmtTime(end)}` : ""}{meet.recurring === "weekly" ? tr(" · every week") : ""}
      </div>
      <div style={{ color: T.text, fontSize: 14.5, marginTop: 8, display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.4 }}><MapPin size={15} color={T.accent2} style={{ flexShrink: 0, marginTop: 2 }} /> {meet.location}</div>
      <button onClick={() => openProfile(meet.submittedBy)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, marginTop: 14 }}>
        <Avatar username={meet.submittedBy} size={26} />
        <span style={{ color: T.textDim, fontSize: 13 }}>{tr("Posted by")} <span style={{ color: T.text, fontWeight: 700 }}>{users[meet.submittedBy]?.name || meet.submittedBy}</span></span>
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
            <button key={r.id} data-testid={`rsvp-${r.id}`} disabled={full || locked} onClick={() => {
              // Saying you're going to a meet with rules: agree to them first (once).
              if (meet.rules && !myRole && r.id !== "organizer") setAgreeFor(r.id); else onToggleGoing(meet.id, r.id);
            }} className="press" style={{
              flex: 1, padding: "10px 6px", borderRadius: 16, border: `1px solid ${on ? T.accent : T.lineDark}`,
              background: on ? "rgba(230,56,70,0.16)" : T.surface, color: on ? T.accent : T.textDim, opacity: full || locked ? 0.55 : 1,
              fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span>{r.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{count}{cap ? `/${cap}` : ""}</span>
              {full && <span style={{ fontSize: 10, color: T.accent }}>{tr("Full")}</span>}
            </button>
          );
        })}
      </div>

      {meet.rules && (
        <div data-testid="meet-rules" style={{ marginTop: 4, marginBottom: 4, padding: "12px 14px", borderRadius: 16, background: "rgba(123,211,137,0.08)", border: "1px solid rgba(123,211,137,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7BD389", fontSize: 12.5, fontWeight: 800, marginBottom: 4 }}><ShieldCheck size={14} /> {tr("Meet rules")}</div>
          <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }} dir="auto">{meet.rules}</div>
        </div>
      )}
      {canManage && <OrganizerTools meet={meet} users={users} onManage={() => setManaging(true)} onInsights={() => onInsights?.(meet.id)} onRepeat={isCreator && onRepeat ? () => onRepeat(meet.id) : null} />}
      <DriverCard meet={meet} me={me} users={users} />
      {canManage && meet.driverNote && !attendees.some((x) => x.username === me && x.role === "driver") && (
        <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 10 }}>{tr("For drivers (only drivers and organizers see this):")} {meet.driverNote}</div>
      )}
      <Announcements meet={meet} me={me} />

      {meet.note && (
        <div style={{ ...section, marginTop: 14 }}>
          <RichText text={meet.note} maxLines={MAX_LINES.note} style={{ color: T.text, fontSize: 15, lineHeight: 1.65 }} />
        </div>
      )}

      {hasPin && (
        <div style={section}>
          <SectionLabel>{tr("Where")}</SectionLabel>
          <div data-noswipe><LeafletMap pin={{ lat: meet.lat, lng: meet.lng }} height={180} interactive={false} /></div>
          <a href={directionsUrl(meet.lat, meet.lng)} target="_blank" rel="noopener noreferrer" className="press" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, padding: "11px", borderRadius: 14,
            background: "rgba(69,123,144,0.2)", color: "#8EC3D6", fontSize: 13.5, fontWeight: 700, textDecoration: "none",
          }}>
            <Navigation size={14} /> {tr("Directions")}
          </a>
        </div>
      )}

      {(meet.sponsors || []).length > 0 && (
        <div style={section}>
          <SectionLabel>{tr("Sponsors")}</SectionLabel>
          <div data-testid="sponsors" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {meet.sponsors.map((sp) => (
              <span key={sp} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: "rgba(242,184,75,0.14)", color: "#F2C76A", fontSize: 12.5, fontWeight: 600 }}>
                <Award size={12} /> {sp}
              </span>
            ))}
          </div>
        </div>
      )}

      <CarsAtMeet meet={meet} me={me} openCar={(id) => safety?.openCar?.(id)} />

      <div style={section}>
        <SectionLabel>{tr("Organizing")}</SectionLabel>
        {organizers.map((a) => (
          <button key={a.username} onClick={() => openProfile(a.username)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "6px 0", textAlign: "start" }}>
            <Avatar username={a.username} size={32} />
            <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{users[a.username]?.name || a.username}</span>
          </button>
        ))}
      </div>

      <div style={section} data-testid="whos-going">
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}><SectionLabel>{tr("Who's going")}</SectionLabel></div>
        </div>
        {goingKnown.map((a) => (
          <button key={a.username} data-testid="going-known" onClick={() => openProfile(a.username)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "6px 0", textAlign: "start" }}>
            <Avatar username={a.username} size={30} />
            <span style={{ color: T.text, fontSize: 13.5, fontWeight: 600, flex: 1 }}>{a.username === me ? tr("You") : users[a.username]?.name || a.username}</span>
            <span style={{ color: T.textDim, fontSize: 12 }}>{MEET_ROLES.find((r) => r.id === a.role)?.label}</span>
          </button>
        ))}
        <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 6 }}>
          {goingOthers > 0 ? tr("+ {0} {1} you don't follow mutually", goingOthers, goingOthers === 1 ? tr("other") : tr("others")) : goingKnown.length === 0 ? tr("No one you know yet.") : ""}
        </div>
      </div>

      {viewPhoto && (
        <div onClick={() => setViewPhoto(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={meet.cover} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
      <ManagePeople open={managing} onClose={() => setManaging(false)} meet={meet} users={users} me={me} onSetRole={onSetRole} onSetCaps={onSetCaps} />
      <BottomSheet open={!!agreeFor} onClose={() => setAgreeFor(null)} title={tr("Before you go")} maxHeight="75vh">
        <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 10 }}>{tr("The organizers ask everyone going to stick to these:")}</div>
        <div style={{ color: T.text, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", marginBottom: 16 }} dir="auto">{meet.rules}</div>
        <button data-testid="agree-rules" onClick={() => { const role = agreeFor; setAgreeFor(null); onToggleGoing(meet.id, role); }} className="press" style={{ width: "100%", padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 15 }}>
          {tr("I agree, count me in")}
        </button>
      </BottomSheet>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title={tr("Delete this meet?")}
        body={tr("It will be removed for everyone. This can't be undone.")} onConfirm={() => onDelete(meet.id)} />
    </div>
  );
}

// Organizer tools: limits for Driving / Attending, and moving people between lists.
function ManagePeople({ open, onClose, meet, users, onSetRole, onSetCaps }) {
  const [driver, setDriver] = useState(String(meet.caps?.driver || ""));
  const [attendee, setAttendee] = useState(String(meet.caps?.attendee || ""));
  const people = meet.attendees || [];
  return (
    <BottomSheet open={open} onClose={onClose} title={tr("Manage people")} maxHeight="85vh">
      <SectionLabel>{tr("Limits (empty = no limit)")}</SectionLabel>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>{tr("Driving")}
          <input data-testid="cap-driver" inputMode="numeric" value={driver} onChange={(e) => setDriver(e.target.value.replace(/[^0-9]/g, ""))} placeholder={tr("No limit")}
            style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14 }} />
        </label>
        <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>{tr("Attending")}
          <input data-testid="cap-attendee" inputMode="numeric" value={attendee} onChange={(e) => setAttendee(e.target.value.replace(/[^0-9]/g, ""))} placeholder={tr("No limit")}
            style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14 }} />
        </label>
      </div>
      <button onClick={() => onSetCaps(meet.id, { driver, attendee })} className="press" style={{ width: "100%", padding: 11, borderRadius: 14, border: "none", background: T.accent, color: "#fff", fontWeight: 600, marginBottom: 18 }}>{tr("Save limits")}</button>

      <SectionLabel>{tr("People ·")} {people.length}</SectionLabel>
      {people.map((a) => (
        <div key={a.username} data-testid="manage-row" style={{ padding: "10px 0", borderBottom: `1px solid ${T.lineDark}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Avatar username={a.username} size={28} />
            <span style={{ color: T.text, fontSize: 13.5, fontWeight: 600, flex: 1 }}>{users[a.username]?.name || a.username}</span>
            {a.username !== meet.submittedBy && (
              <button aria-label={tr("Remove {0}", a.username)} onClick={() => onSetRole(meet.id, a.username, null)} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 700 }}>{tr("Remove")}</button>
            )}
          </div>
          {a.username === meet.submittedBy ? <div style={{ color: T.textDim, fontSize: 11.5 }}>{tr("Created the meet · always organizing")}</div> : (
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
// editing: the meet being changed. copyFrom: "Run it again": a new meet filled in from an old one, a week on.
export function AddMeetForm({ onSubmit, editing: editingMeet, copyFrom }) {
  const editing = editingMeet || (copyFrom ? { ...copyFrom, ...nextWeekSlot(copyFrom) } : null);
  const [title, setTitle] = useState(editing?.title || "");
  const [place, setPlace] = useState({ location: editing?.location || "", lat: editing?.lat ?? null, lng: editing?.lng ?? null, city: editing?.city || "", country: editing?.country || "" });
  const [when, setWhen] = useState(editing?.when || "");
  const [note, setNote] = useState(editing?.note || "");
  const [cover, setCover] = useState(editing?.cover || null);
  const [sponsors, setSponsors] = useState(editing?.sponsors || []);
  const [sponsor, setSponsor] = useState("");
  const [capDriver, setCapDriver] = useState(String(editing?.caps?.driver || ""));
  const [capAttendee, setCapAttendee] = useState(String(editing?.caps?.attendee || ""));
  const [hours, setHours] = useState(editing?.endWhen && editing?.when ? Math.max(1, hoursBetween(editing.when, editing.endWhen)) : 4);
  const [recurring, setRecurring] = useState(editing?.recurring === "weekly");
  const [approveDrivers, setApproveDrivers] = useState(!!editing?.approveDrivers);
  const [driverNote, setDriverNote] = useState(editing?.driverNote || "");
  const [rules, setRules] = useState(editing?.rules || "");
  const [busy, setBusy] = useState(false);
  const pro = true; // every meet gets the Pro tools during beta
  const endWhen = when ? toLocal(new Date(new Date(when).getTime() + hours * 3600e3)) : "";
  const toggle = (on, set, label, testid, sub) => (
    <button data-testid={testid} onClick={() => (pro ? set(!on) : null)} className="press" style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 14, marginBottom: 8, textAlign: "start",
      border: `1px solid ${on && pro ? T.accent : T.lineDark}`, background: T.surface2, opacity: pro ? 1 : 0.5,
    }}>
      <span style={{ flex: 1 }}><span style={{ color: T.text, fontSize: 13.5, fontWeight: 700 }}>{label}</span><br /><span style={{ color: T.textDim, fontSize: 11.5 }}>{sub}</span></span>
      <span style={{ width: 38, height: 22, borderRadius: 99, background: on && pro ? T.accent : "rgba(255,255,255,0.15)", position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 3, left: on && pro ? 19 : 3, width: 16, height: 16, borderRadius: 99, background: "#fff", transition: "left 0.15s" }} />
      </span>
    </button>
  );
  const valid = title.trim() && place.location.trim() && when;
  const addSponsor = () => {
    const sp = sponsor.trim();
    if (sp && !sponsors.includes(sp) && sponsors.length < 8) setSponsors([...sponsors, sp]);
    setSponsor("");
  };
  const capInput = (val, set, testid) => (
    <input data-testid={testid} inputMode="numeric" value={val} onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ""))} placeholder={tr("No limit")}
      style={{ width: "100%", padding: "11px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface2, color: T.text, fontSize: 14, outline: "none" }} />
  );

  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 14 }}>{editingMeet ? tr("Edit meet") : copyFrom ? tr("Run it again") : tr("New meet")}</div>
      {copyFrom && <div data-testid="copy-note" style={{ color: T.textDim, fontSize: 12.5, margin: "-8px 0 14px" }}>{tr("Copied from \"{0}\", moved a week on. Check the details, then post.", copyFrom.title)}</div>}

      {/* Cover + title, like an event poster */}
      <div style={{ marginBottom: 14 }}>
        {cover ? (
          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden" }}>
            <img src={cover} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
            <button onClick={() => setCover(null)} className="glass press" style={{ position: "absolute", right: 10, top: 10, border: "none", padding: "7px 12px", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 600 }}>{tr("Change cover")}</button>
          </div>
        ) : (
          <PhotoPicker onPick={(src) => setCover(src)} aspect={16 / 9} maxDim={1080} quality={0.72} title={tr("Event cover")} hint={tr("Shown at the top of the meet page (optional)")} testid="meet-cover" />
        )}
        <input data-testid="meet-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Name your meet")} maxLength={60}
          className="display" style={{ width: "100%", marginTop: 14, padding: "6px 2px", border: "none", borderBottom: `1.5px solid ${T.lineDark}`, background: "transparent", color: T.text, fontSize: 24, outline: "none" }} />
      </div>

      <Section title={tr("When & where")} icon={<Calendar size={16} color={T.accent2} />}>
        <DateTimePicker value={when} onChange={setWhen} />
        <div style={{ color: T.textDim, fontSize: 12, margin: "12px 0 6px" }}>{tr("How long?")}</div>
        <div data-testid="meet-hours" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[1, 2, 3, 4, 6, 8, 12].map((h) => (
            <button key={h} onClick={() => setHours(h)} className="press" style={{
              padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${hours === h ? T.accent : T.lineDark}`, background: hours === h ? "rgba(230,56,70,0.14)" : "transparent", color: hours === h ? T.accent : T.text,
            }}>{h}h</button>
          ))}
        </div>
        <LocationPicker value={place} onChange={setPlace} />
      </Section>

      <Section title={tr("About")} icon={<FileText size={16} color={T.accent} />} hint={tr("Reads like the article on the meet page.")}>
        <TextArea value={note} onChange={setNote} placeholder={tr("What's the plan? Route, entry, rules, food…")} maxLength={500} rows={5} maxLines={MAX_LINES.note} />
      </Section>

      <Section title={tr("Meet rules")} icon={<ShieldCheck size={16} color="#7BD389" />} hint={tr("Optional. People agree to these when they say they're going.")}>
        <div data-testid="meet-rules-input"><TextArea value={rules} onChange={setRules} placeholder={tr("e.g. No burnouts or revving. Respect the venue. Leave no trash.")} maxLength={500} rows={3} maxLines={10} /></div>
      </Section>

      <Section title={tr("Who can come")} icon={<Users size={16} color={T.accentWarm} />} hint={tr("You're on the organizing list. Leave a limit empty for no limit.")}>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>{tr("Driving limit")}{capInput(capDriver, setCapDriver, "form-cap-driver")}</label>
          <label style={{ flex: 1, color: T.textDim, fontSize: 12 }}>{tr("Attending limit")}{capInput(capAttendee, setCapAttendee, "form-cap-attendee")}</label>
        </div>
      </Section>

      <Section title={tr("For drivers")} icon={<Info size={16} color="#8EC3D6" />} hint={tr("Only drivers and organizers see this (entry time, parking, route…).")}>
        <TextArea value={driverNote} onChange={setDriverNote} placeholder={tr("e.g. Drivers enter from gate 3 at 7:30pm")} maxLength={300} rows={2} maxLines={6} />
      </Section>

      <Section title={tr("Extras")} icon={<Repeat size={16} color="#F2C76A" />} hint={tr("Optional. Pro tools, free during beta.")}>
        {toggle(recurring, setRecurring, tr("Repeats every week"), "opt-weekly", tr("Same day and time, every week"))}
        {toggle(approveDrivers, setApproveDrivers, tr("Approve drivers"), "opt-approve", tr("You confirm each driver and their car"))}
      </Section>

      <Section title={tr("Sponsors")} icon={<Award size={16} color={T.accentWarm} />} hint={tr("Optional.")}>
        <div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter") addSponsor(); }}>
            <TextInput value={sponsor} onChange={setSponsor} placeholder={tr("e.g. Shine Garage")} maxLength={40} />
          </div>
          <button onClick={addSponsor} aria-label={tr("Add sponsor")} disabled={!sponsor.trim()} className="press" style={{ padding: "0 16px", borderRadius: 16, border: "none", background: sponsor.trim() ? T.accent : T.surface2, color: sponsor.trim() ? "#fff" : T.textDim }}>
            <Plus size={16} />
          </button>
        </div>
        {sponsors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {sponsors.map((sp) => (
              <span key={sp} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 12px", borderRadius: 999, background: "rgba(242,184,75,0.16)", color: "#F2C76A", fontSize: 12.5, fontWeight: 600 }}>
                {sp}
                <button aria-label={tr("Remove {0}", sp)} onClick={() => setSponsors(sponsors.filter((x) => x !== sp))} style={{ background: "none", border: "none", padding: 0, display: "flex" }}><X size={13} color="#F2C76A" /></button>
              </span>
            ))}
          </div>
        )}
        </div>
      </Section>

      <button data-testid="submit-meet" disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ title, ...place, when, endWhen, note, cover, sponsors, caps: { driver: capDriver, attendee: capAttendee }, recurring: recurring ? "weekly" : "none", approveDrivers, driverNote, rules }); setBusy(false); }}
        style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? (editingMeet ? tr("Saving…") : tr("Posting…")) : (editingMeet ? tr("Save changes") : tr("Post meet"))}
      </button>
      {!valid && (
        <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", marginTop: 8 }}>
          {tr("Still needed:")} {[!title.trim() && tr("name"), !when && tr("date & time"), !place.location.trim() && tr("location")].filter(Boolean).join(tr(", "))}
        </div>
      )}
    </div>
  );
}
