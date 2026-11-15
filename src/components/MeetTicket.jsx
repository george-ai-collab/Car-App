// Your ticket for a meet: looks like a real ticket (notches, a tear line), with the QR and your
// own code underneath, so organizers can scan it or type it in.
import { useEffect } from "react";
import { Ticket, MapPin, CalendarDays, Car, Check, Clock } from "lucide-react";
import { T, MONO_STACK } from "../theme";
import { tr, AT } from "../lib/i18n";
import { fmtWhen } from "../lib/utils";
import { ticketLink } from "../lib/tag";
import { TagQR } from "./ShareTag";
import { BottomSheet } from "./ui";
import { logoWhite } from "./Logo";

const ROLE = { driver: "Driver", attendee: "Going", organizer: "Organizer" };

export function MeetTicketSheet({ open, onClose, meet, me, users, cars, code, onNeedCode }) {
  useEffect(() => { if (open && !code) onNeedCode?.(); }, [open, code]);
  if (!open || !meet) return null;
  const mine = (meet.attendees || []).find((a) => a.username === me);
  const car = mine?.carId ? cars?.[mine.carId] : null;
  return (
    <BottomSheet open={open} onClose={onClose} title={tr("Your ticket")} maxHeight="92vh">
      <div data-testid="meet-ticket" style={{ position: "relative", margin: "4px auto 8px", maxWidth: 340, filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.45))" }}>
        {/* top: the event */}
        <div style={{
          borderRadius: "22px 22px 0 0", padding: "18px 20px 20px", color: "#fff", position: "relative", overflow: "hidden",
          background: `radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.14), transparent 55%), linear-gradient(150deg, ${T.accent}, ${T.accentDeep})`,
          WebkitMask: notchMask("bottom"), mask: notchMask("bottom"),
        }}>
          <img src={logoWhite} alt="" aria-hidden style={{ position: "absolute", right: -18, top: -10, width: 120, opacity: 0.12, transform: "rotate(-12deg)" }} />
          <div className="plate" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, opacity: 0.85 }}><Ticket size={12} /> {tr("Meet ticket")} · {tr(ROLE[mine?.role] || "Going")}</div>
          <div className="display" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 8, paddingRight: 30 }}>{meet.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14, fontSize: 12 }}>
            <Field icon={<CalendarDays size={12} />} label={tr("When")} value={fmtWhen(meet.when)} />
            <Field icon={<MapPin size={12} />} label={tr("Where")} value={meet.city || meet.location || "—"} />
            <Field label={tr("Holder")} value={users?.[me]?.name || me} sub={`${AT}${me}`} />
            {car ? <Field icon={<Car size={12} />} label={tr("Car")} value={car.nickname || `${car.make} ${car.model}`} /> : <Field label={tr("Admits")} value={tr("One person")} />}
          </div>
        </div>
        {/* tear line */}
        <div aria-hidden style={{ height: 0, borderTop: "2px dashed rgba(255,255,255,0.18)", margin: "0 18px", position: "relative", zIndex: 2 }} />
        {/* bottom: the stub with the QR and code */}
        <div style={{ borderRadius: "0 0 22px 22px", padding: "18px 20px 20px", background: T.paper, color: T.ink, textAlign: "center",
          WebkitMask: notchMask("top"), mask: notchMask("top") }}>
          {code ? (
            <>
              <div style={{ display: "inline-block", padding: 8, borderRadius: 14, background: "#fff", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}>
                <TagQR text={ticketLink(meet.id, code)} size={176} />
              </div>
              <div data-testid="ticket-code" style={{ fontFamily: MONO_STACK, fontSize: 24, fontWeight: 700, letterSpacing: "0.18em", marginTop: 10 }}>{code}</div>
              <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 4 }}>{tr("Show this at the entrance. The code works if the QR can't be scanned.")}</div>
            </>
          ) : (
            <div style={{ padding: "40px 0", color: T.inkMuted, fontSize: 13 }}>{tr("Getting your ticket…")}</div>
          )}
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
            background: mine?.checkedIn ? "rgba(143,191,154,0.22)" : "rgba(21,22,26,0.06)", color: mine?.checkedIn ? "#2F6B3E" : T.inkMuted }}>
            {mine?.checkedIn ? <><Check size={12} /> {tr("Checked in")}</> : mine?.role === "driver" && mine?.approved === false ? <><Clock size={12} /> {tr("Waiting for the organizer's OK")}</> : tr("Not checked in yet")}
          </div>
        </div>
      </div>
      <div style={{ color: T.textDim, fontSize: 11.5, textAlign: "center", lineHeight: 1.5, marginTop: 6 }}>{tr("Your code is yours only. Each ticket checks in once.")}</div>
    </BottomSheet>
  );
}

// Half-circle notches on the sides, where the ticket tears.
const notchMask = (edge) => `radial-gradient(circle 12px at 0 ${edge === "bottom" ? "100%" : "0"}, transparent 98%, #000 100%) left / 51% 100% no-repeat, radial-gradient(circle 12px at 100% ${edge === "bottom" ? "100%" : "0"}, transparent 98%, #000 100%) right / 51% 100% no-repeat`;

function Field({ icon, label, value, sub }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="plate" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, opacity: 0.75 }}>{icon}{label}</div>
      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {sub && <div className="plate handle" style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
