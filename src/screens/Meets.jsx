import { useState } from "react";
import { MapPin, Clock, Pencil, Trash2, Navigation } from "lucide-react";
import { T } from "../theme";
import { fmtWhen, isPast } from "../lib/utils";
import { Field, TextInput, TextArea, ConfirmDialog } from "../components/ui";
import { DateTimePicker } from "../components/DateTimePicker";
import { LocationPicker, directionsUrl } from "../components/LocationPicker";

export const MEET_ROLES = [
  { id: "organizer", label: "Organizing" },
  { id: "driver", label: "Driving" },
  { id: "attendee", label: "Attending" },
];

export function MeetCard({ meet, me, onToggleGoing, onEdit, onDelete }) {
  const attendees = meet.attendees || [];
  const myRole = attendees.find((a) => a.username === me)?.role;
  const isMine = meet.submittedBy === me;
  const [confirm, setConfirm] = useState(false);
  const past = isPast(meet.when);
  const hasPin = meet.lat != null && meet.lng != null;
  return (
    <div style={{ marginBottom: 12, padding: 14, borderRadius: 20, background: T.surface, border: `1px solid ${T.lineDark}`, boxShadow: T.shadowCard }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 600, flex: 1 }}>{meet.title}</div>
        {isMine && onEdit && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => onEdit(meet.id)} aria-label="Edit meet" className="press" style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pencil size={12} color={T.textDim} />
            </button>
            <button onClick={() => setConfirm(true)} aria-label="Delete meet" className="press" style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} color={T.accent} />
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: past ? T.textDim : T.accent2, display: "flex", alignItems: "center", gap: 5 }}><Clock size={12} /> {fmtWhen(meet.when)}{past ? " · Ended" : ""}</span>
        <span style={{ fontSize: 12.5, color: T.textDim, display: "flex", alignItems: "flex-start", gap: 5, lineHeight: 1.35 }}><MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} /> {meet.location}</span>
      </div>
      {hasPin && (
        <a href={directionsUrl(meet.lat, meet.lng)} target="_blank" rel="noopener noreferrer" className="press" style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "7px 12px", borderRadius: 999,
          background: "rgba(69,123,144,0.18)", color: "#8EC3D6", fontSize: 12, fontWeight: 600, textDecoration: "none",
        }}>
          <Navigation size={12} /> Directions
        </a>
      )}
      {meet.note && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 10, lineHeight: 1.4 }}>{meet.note}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        {MEET_ROLES.map((r) => {
          const count = attendees.filter((a) => a.role === r.id).length;
          const mine = myRole === r.id;
          return (
            <button key={r.id} onClick={() => onToggleGoing(meet.id, r.id)} className="press" style={{
              flex: 1, padding: "8px 6px", borderRadius: 16, border: `1px solid ${mine ? T.accent : T.lineDark}`,
              background: mine ? "rgba(230,56,70,0.14)" : "transparent", color: mine ? T.accent : T.textDim,
              fontSize: 11.5, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
            </button>
          );
        })}
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete this meet?"
        body="It will be removed for everyone. This can't be undone." onConfirm={() => onDelete(meet.id)} />
    </div>
  );
}

export function AddMeetForm({ onSubmit, editing }) {
  const [title, setTitle] = useState(editing?.title || "");
  const [place, setPlace] = useState({ location: editing?.location || "", lat: editing?.lat ?? null, lng: editing?.lng ?? null });
  const [when, setWhen] = useState(editing?.when || "");
  const [note, setNote] = useState(editing?.note || "");
  const [busy, setBusy] = useState(false);
  const valid = title.trim() && place.location.trim() && when;
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>{editing ? "Edit meet" : "Post a meet"}</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>{editing ? "Update the details." : "Let people know where and when."}</div>
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="e.g. Friday night cars & coffee" maxLength={60} /></Field>
      <Field label="When"><DateTimePicker value={when} onChange={setWhen} /></Field>
      <Field label="Where"><LocationPicker value={place} onChange={setPlace} /></Field>
      <Field label="Note (optional)"><TextArea value={note} onChange={setNote} placeholder="Anything people should know" maxLength={200} rows={3} /></Field>
      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ title, ...place, when, note }); setBusy(false); }}
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
