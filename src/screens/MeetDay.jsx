import { useState } from "react";
import { ScanLine, Megaphone, SlidersHorizontal, BarChart3, Download, Check, X, Car, MapPin, BadgeCheck, QrCode, Info, Repeat, Ticket, Keyboard } from "lucide-react";
import { T } from "../theme";
import { Avatar, BottomSheet, TextArea, TextInput, SectionLabel } from "../components/ui";
import { MeetTicketSheet } from "../components/MeetTicket";
import { useSafety } from "../components/Safety";
import { scanTag } from "../lib/scan";
import { parseTag } from "../lib/tag";
import { shareText } from "../lib/share";
import { timeAgo } from "../lib/utils";
import { tr , AT } from "../lib/i18n";

const card = { background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, padding: 14, marginTop: 14 };
const pill = (on) => ({
  padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
  border: `1px solid ${on ? T.accent : T.lineDark}`, background: on ? "rgba(212,67,77,0.14)" : "transparent", color: on ? T.accent : T.text,
});
const tool = (locked) => ({
  flex: "1 1 45%", padding: "11px 10px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  border: `1px solid ${T.lineDark}`, background: "rgba(255,255,255,0.04)", color: locked ? T.textDim : T.text, fontWeight: 700, fontSize: 13,
});

// ---------- organizer tools (all of them free while Lacerta is in beta) ----------
export function OrganizerTools({ meet, users, onManage, onInsights, onRepeat }) {
  const safety = useSafety();
  const a = safety.actions;
  const [announcing, setAnnouncing] = useState(false);
  const [text, setText] = useState("");
  const [audience, setAudience] = useState("all");
  const people = meet.attendees || [];
  const drivers = people.filter((p) => p.role === "driver" && p.approved !== false);
  const attending = people.filter((p) => p.role === "attendee");
  const pending = people.filter((p) => p.role === "driver" && p.approved === false);
  const checked = people.filter((p) => p.checkedIn).length;
  const caps = meet.caps || {};

  const doCheckIn = async () => {
    const r = await scanTag();
    if (r.error) { safety.flash(r.error); return; }
    if (!r.text) return;
    const t = parseTag(r.text);
    if (t?.kind === "ticket") {
      if (t.meetId !== meet.id) { safety.flash(tr("That ticket is for a different meet")); return; }
      await byTicket(t.code);
      return;
    }
    if (!t || t.kind !== "user") { safety.flash(tr("Scan the person's ticket")); return; }
    const res = await a.checkIn(meet.id, t.id);
    safety.flash(res === "ok" ? tr("@{0} checked in ✓", t.id) : res === "already" ? tr("@{0} is already checked in", t.id) : tr("@{0} isn't on the list", t.id));
  };
  // A ticket's code (scanned, or typed when the QR won't scan).
  const byTicket = async (code) => {
    const res = await a.checkInTicket(meet.id, code);
    const h = res.handle;
    safety.flash(res.status === "ok" ? tr("@{0} checked in ✓", h) : res.status === "already" ? tr("@{0} is already checked in", h)
      : res.status === "waiting" ? tr("@{0} is still waiting for your OK", h) : res.status === "error" ? tr("Couldn't check that ticket. Try again.") : tr("No ticket with that code for this meet"));
    return res.status;
  };
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const exportList = () => {
    const rows = [["handle", "name", "role", "car", "said going", "checked in"], ...people.map((p) => {
      const car = p.carId && safety.cars?.[p.carId];
      return [p.username, users[p.username]?.name || "", p.role, car ? `${car.year} ${car.make} ${car.model}` : "", p.joinedAt ? p.joinedAt.slice(0, 16).replace("T", " ") : "", p.checkedInAt ? p.checkedInAt.slice(0, 16).replace("T", " ") : p.checkedIn ? "yes" : ""];
    })];
    shareText({ title: tr("{0}: people", meet.title), text: rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n") });
  };
  const meetTag = () => safety.openTag({ kind: "meet", id: meet.id, title: meet.title, subtitle: [meet.city, meet.location].filter(Boolean)[0] || "" });

  return (
    <div data-testid="organizer-tools" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <SlidersHorizontal size={15} color={T.accent} />
        <span style={{ color: T.text, fontWeight: 800, fontSize: 14.5, flex: 1 }}>{tr("Organizer tools")}</span>
        <span data-testid="pro-free" style={{ color: "#D9BE8A", fontSize: 11, fontWeight: 700 }}>{tr("Pro · free in beta")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          [tr("Driving"), `${drivers.length}${caps.driver ? `/${caps.driver}` : ""}`, "driving"],
          [tr("Attending"), `${attending.length}${caps.attendee ? `/${caps.attendee}` : ""}`, "attending"],
          [tr("Checked in"), `${checked}/${people.length}`, "checked-in"],
        ].map(([l, v, id]) => (
          <div key={id} style={{ textAlign: "center", padding: "9px 4px", borderRadius: 14, background: "rgba(255,255,255,0.04)" }}>
            <div className="plate" data-testid={`count-${id}`} style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>{v}</div>
            <div style={{ color: T.textDim, fontSize: 10.5 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button data-testid="tool-checkin" onClick={doCheckIn} className="press" style={tool(false)}><ScanLine size={15} /> {tr("Check in")}</button>
        <button data-testid="tool-type-code" onClick={() => setTyping(true)} className="press" style={tool(false)}><Keyboard size={15} /> {tr("Type a code")}</button>
        <button data-testid="tool-announce" onClick={() => setAnnouncing(true)} className="press" style={tool(false)}><Megaphone size={15} /> {tr("Announce")}</button>
        <button data-testid="tool-insights" onClick={onInsights} className="press" style={tool(false)}><BarChart3 size={15} /> {tr("Insights")}</button>
        <button data-testid="tool-manage" onClick={onManage} className="press" style={tool(false)}><SlidersHorizontal size={15} /> {tr("Manage people")}</button>
        <button data-testid="tool-tag" onClick={meetTag} className="press" style={tool(false)}><QrCode size={15} /> {tr("Meet tag")}</button>
        <button data-testid="tool-export" onClick={exportList} className="press" style={tool(false)}><Download size={15} /> {tr("Export list")}</button>
        {onRepeat && <button data-testid="tool-repeat" onClick={onRepeat} className="press" style={{ ...tool(false), flexBasis: "100%" }}><Repeat size={15} /> {tr("Run it again next week")}</button>}
      </div>

      {meet.approveDrivers && (
        <div style={{ marginTop: 14 }}>
          <SectionLabel>{tr("Drivers waiting ·")} {pending.length}</SectionLabel>
          {pending.length === 0 && <div style={{ color: T.textDim, fontSize: 12.5 }}>{tr("No one waiting.")}</div>}
          {pending.map((p) => {
            const car = p.carId && safety.cars?.[p.carId];
            return (
              <div key={p.username} data-testid="pending-driver" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <Avatar username={p.username} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.text, fontSize: 13.5, fontWeight: 700 }}>{AT}{p.username}</div>
                  <div style={{ color: T.textDim, fontSize: 11.5 }}>{car ? `${car.year} ${car.make} ${car.model}` : tr("No car picked yet")}</div>
                </div>
                <button aria-label={tr("Approve {0}", p.username)} data-testid="approve" onClick={() => a.approveDriver(meet.id, p.username, true)} className="press" style={{ ...pill(true), display: "flex", alignItems: "center", gap: 4 }}><Check size={13} /> {tr("OK")}</button>
                <button aria-label={tr("Decline {0}", p.username)} onClick={() => a.approveDriver(meet.id, p.username, false)} className="press" style={{ ...pill(false), display: "flex", alignItems: "center" }}><X size={13} /></button>
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet open={typing} onClose={() => setTyping(false)} title={tr("Check in by code")} maxHeight="60vh">
        <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 10 }}>{tr("The code is under the QR on their ticket, like K7QM-2XAP.")}</div>
        <TextInput value={typed} onChange={(v) => setTyped(v.toUpperCase())} placeholder="XXXX-XXXX" maxLength={12} autoFocus />
        <button data-testid="check-code" disabled={typed.replace(/[^A-Za-z0-9]/g, "").length !== 8} onClick={async () => { const st = await byTicket(typed); if (st === "ok" || st === "already") { setTyped(""); setTyping(false); } }} className="press" style={{
          width: "100%", marginTop: 10, padding: 13, borderRadius: 16, border: "none", fontWeight: 700, fontSize: 15,
          background: typed.replace(/[^A-Za-z0-9]/g, "").length === 8 ? T.accent : T.surface2, color: typed.replace(/[^A-Za-z0-9]/g, "").length === 8 ? "#fff" : T.textDim,
        }}>{tr("Check in")}</button>
      </BottomSheet>

      <BottomSheet open={announcing} onClose={() => setAnnouncing(false)} title={tr("Announcement")} maxHeight="70vh">
        <div data-testid="announce-audience" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[["all", tr("Everyone going")], ["drivers", tr("Drivers only")]].map(([id, label]) => (
            <button key={id} data-testid={`audience-${id}`} onClick={() => setAudience(id)} className="press" style={pill(audience === id)}>{label}</button>
          ))}
        </div>
        <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 10 }}>{audience === "drivers" ? tr("Drivers and organizers get a notification.") : tr("Everyone going gets a notification.")} {tr("One every 10 minutes.")}</div>
        <TextArea value={text} onChange={setText} placeholder={tr("e.g. Gate moved to the north entrance")} maxLength={300} rows={3} maxLines={6} autoFocus />
        <button data-testid="send-announcement" disabled={!text.trim()} onClick={async () => { if (await a.announce(meet.id, text, audience)) { setText(""); setAnnouncing(false); } }} className="press" style={{
          width: "100%", marginTop: 10, padding: 13, borderRadius: 16, border: "none", fontWeight: 700, fontSize: 15,
          background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim,
        }}>{audience === "drivers" ? tr("Send to drivers") : tr("Send to everyone going")}</button>
      </BottomSheet>
    </div>
  );
}

// ---------- you're driving: pick your car, show your pass ----------
export function DriverCard({ meet, me, users }) {
  const safety = useSafety();
  const mine = (meet.attendees || []).find((p) => p.username === me);
  const myCars = Object.values(safety.cars || {}).filter((c) => c.ownerUsername === me);
  if (!mine || mine.role !== "driver") return null;
  return (
    <div data-testid="driver-card" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Car size={15} color={T.accent2} />
        <span style={{ color: T.text, fontWeight: 800, fontSize: 14.5, flex: 1 }}>{tr("You're driving")}</span>
        {mine.approved === false && <span data-testid="driver-pending" style={{ color: "#D9BE8A", fontSize: 11.5, fontWeight: 700 }}>{tr("Waiting for OK")}</span>}
        {mine.checkedIn && <span style={{ color: "#8FBF9A", fontSize: 11.5, fontWeight: 700 }}>{tr("Checked in ✓")}</span>}
      </div>
      <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 8 }}>{tr("Which car are you bringing? It shows in \"Cars at this meet\".")}</div>
      {myCars.length === 0 ? <div style={{ color: T.textDim, fontSize: 12.5 }}>{tr("Add a car to your garage first.")}</div> : (
        <div data-testid="pick-my-car" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {myCars.map((c) => (
            <button key={c.id} onClick={() => safety.actions.setMeetCar(meet.id, mine.carId === c.id ? null : c.id)} className="press" style={pill(mine.carId === c.id)}>
              {c.nickname || `${c.make} ${c.model}`}
            </button>
          ))}
        </div>
      )}
      {meet.driverNote && (
        <div data-testid="driver-note" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 14, background: "rgba(138,155,170,0.16)", color: T.text, fontSize: 13, lineHeight: 1.45, display: "flex", gap: 8 }}>
          <Info size={15} color="#AEBBC6" style={{ flexShrink: 0, marginTop: 1 }} /><div><b>{tr("For drivers:")}</b> {meet.driverNote}</div>
        </div>
      )}
    </div>
  );
}

// ---------- announcements ----------
export function Announcements({ meet, me }) {
  const myRole = (meet.attendees || []).find((p) => p.username === me)?.role;
  const insider = meet.submittedBy === me || myRole === "driver" || myRole === "organizer";
  const list = (meet.announcements || []).filter((x) => x.audience !== "drivers" || insider);
  if (!list.length) return null;
  return (
    <div data-testid="announcements" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Megaphone size={15} color="#D9BE8A" /><span style={{ color: T.text, fontWeight: 800, fontSize: 14.5 }}>{tr("Updates")}</span>
      </div>
      {list.map((x) => (
        <div key={x.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.lineDark}` }}>
          <div style={{ color: T.text, fontSize: 14, lineHeight: 1.45 }}>{x.text}</div>
          <div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>{AT}{x.author} · {timeAgo(x.date)}{x.audience === "drivers" ? tr(" · drivers only") : ""}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- the cars coming, and spotting them ----------
export function CarsAtMeet({ meet, me, openCar }) {
  const safety = useSafety();
  const cars = safety.cars || {};
  const list = (meet.attendees || []).filter((p) => p.role === "driver" && p.approved !== false && p.carId && cars[p.carId]).map((p) => cars[p.carId]);
  const spots = meet.spots || [];
  const mineSpotted = (carId) => spots.find((s) => s.carId === carId && s.user === me);
  const canSpot = !safety.users?.[me]?.accountType || safety.users[me].accountType === "personal";
  const scanCar = async () => {
    const r = await scanTag();
    if (r.error) { safety.flash(r.error); return; }
    if (!r.text) return;
    const t = parseTag(r.text);
    if (!t || t.kind !== "car") { safety.flash(tr("Scan a car's tag")); return; }
    if (!list.some((c) => c.id === t.id)) { safety.flash(tr("That car isn't listed at this meet")); return; }
    await safety.actions.spotAtMeet(meet.id, t.id, true);
  };
  return (
    <div data-testid="cars-at-meet" style={{ padding: "18px 0", borderTop: `1px solid ${T.lineDark}` }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={{ flex: 1 }}><SectionLabel>{tr("Cars at this meet ·")} {list.length}</SectionLabel></div>
        {canSpot && list.length > 0 && <button data-testid="scan-car" onClick={scanCar} className="press" style={{ ...pill(false), display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}><ScanLine size={13} /> {tr("Scan a car")}</button>}
      </div>
      {list.length === 0 ? <div style={{ color: T.textDim, fontSize: 12.5 }}>{tr("Drivers' cars show here once they pick which car they're bringing.")}</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {list.map((c) => {
            const sp = spots.filter((s) => s.carId === c.id);
            const mine = mineSpotted(c.id);
            return (
              <div key={c.id} data-testid="meet-car" style={{ borderRadius: 16, overflow: "hidden", background: T.surface, border: `1px solid ${T.lineDark}` }}>
                <button onClick={() => openCar(c.id)} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", border: "none", padding: 0, background: c.photoUrl ? `url(${c.photoUrl}) center/cover` : "linear-gradient(135deg, rgba(212,67,77,0.3), rgba(20,20,22,1))" }}>
                  {!c.photoUrl && <Car size={28} color="rgba(245,244,242,0.4)" />}
                </button>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nickname || `${c.make} ${c.model}`}</div>
                  <div style={{ color: T.textDim, fontSize: 11, marginBottom: 6 }}>{AT}{c.ownerUsername} · {sp.length} {sp.length === 1 ? tr("spot") : tr("spots")}</div>
                  {c.ownerUsername !== me && canSpot && (
                    <button data-testid="spot-at-meet" disabled={!!mine} onClick={() => safety.actions.spotAtMeet(meet.id, c.id, false)} className="press" style={{ ...pill(!mine), width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: mine ? 0.7 : 1 }}>
                      {mine ? (mine.verified ? <><BadgeCheck size={13} /> {tr("Scanned")}</> : <><Check size={13} /> {tr("Spotted")}</>) : <><MapPin size={13} /> {tr("Spot")}</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- your ticket (everyone going) ----------
export function MyTicket({ meet, me, users }) {
  const safety = useSafety();
  const [open, setOpen] = useState(false);
  const mine = (meet.attendees || []).find((p) => p.username === me);
  if (!mine) return null;
  const code = safety.actions.ticketFor(meet.id);
  return (
    <>
      <button data-testid="my-ticket" onClick={() => setOpen(true)} className="press" style={{
        width: "100%", marginTop: 14, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, textAlign: "start",
        border: "none", color: "#fff", background: `linear-gradient(120deg, ${T.accent}, ${T.accentDeep})`, boxShadow: T.shadowAccent,
      }}>
        <Ticket size={20} />
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: 14.5 }}>{tr("Your ticket")}</span>
          <span style={{ display: "block", fontSize: 11.5, opacity: 0.85 }}>{mine.checkedIn ? tr("Checked in ✓") : tr("Show it at the entrance to check in")}</span>
        </span>
        {code && <span className="plate" style={{ fontSize: 11, letterSpacing: "0.14em", opacity: 0.9 }}>{code}</span>}
      </button>
      <MeetTicketSheet open={open} onClose={() => setOpen(false)} meet={meet} me={me} users={users} cars={safety.cars} code={code} onNeedCode={() => safety.actions.reload?.()} />
    </>
  );
}
