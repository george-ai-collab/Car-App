import { useState } from "react";
import { ScanLine, Megaphone, SlidersHorizontal, BarChart3, Download, Check, X, Car, MapPin, BadgeCheck, Lock, QrCode, Info } from "lucide-react";
import { T } from "../theme";
import { Avatar, BottomSheet, TextArea, SectionLabel } from "../components/ui";
import { useSafety } from "../components/Safety";
import { scanTag } from "../lib/scan";
import { parseTag } from "../lib/tag";
import { shareText } from "../lib/share";
import { timeAgo } from "../lib/utils";
import { PLANS, PLAN_FEATURES, isPro } from "../lib/meets";

const card = { background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, padding: 14, marginTop: 14 };
const pill = (on) => ({
  padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
  border: `1px solid ${on ? T.accent : T.lineDark}`, background: on ? "rgba(230,56,70,0.14)" : "transparent", color: on ? T.accent : T.text,
});
const tool = (locked) => ({
  flex: "1 1 45%", padding: "11px 10px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  border: `1px solid ${T.lineDark}`, background: "rgba(255,255,255,0.04)", color: locked ? T.textDim : T.text, fontWeight: 700, fontSize: 13,
});

export function PlanBadge({ meet }) {
  if (!isPro(meet)) return null;
  return <span data-testid="pro-badge" className="plate" style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", color: "#1A1205", background: "linear-gradient(135deg, #F2C76A, #E0A93B)", borderRadius: 5, padding: "2px 6px" }}>PRO</span>;
}

// ---------- organizer tools ----------
export function OrganizerTools({ meet, users, onManage }) {
  const safety = useSafety();
  const a = safety.actions;
  const [announcing, setAnnouncing] = useState(false);
  const [text, setText] = useState("");
  const [stats, setStats] = useState(false);
  const pro = isPro(meet);
  const people = meet.attendees || [];
  const drivers = people.filter((p) => p.role === "driver" && p.approved !== false);
  const attending = people.filter((p) => p.role === "attendee");
  const pending = people.filter((p) => p.role === "driver" && p.approved === false);
  const checked = people.filter((p) => p.checkedIn).length;
  const caps = meet.caps || {};
  const annLeft = pro ? null : Math.max(0, PLANS.free.announcements - (meet.announcements || []).length);

  const doCheckIn = async () => {
    const r = await scanTag();
    if (r.error) { safety.flash(r.error); return; }
    if (!r.text) return;
    const t = parseTag(r.text);
    if (!t || t.kind !== "user") { safety.flash("Scan the person's profile tag"); return; }
    const res = await a.checkIn(meet.id, t.id);
    safety.flash(res === "ok" ? `@${t.id} checked in ✓` : res === "already" ? `@${t.id} is already checked in` : `@${t.id} isn't on the list`);
  };
  const exportList = () => {
    if (!pro) { safety.flash("Export is a Pro feature"); return; }
    const rows = [["handle", "name", "role", "car", "checked in"], ...people.map((p) => {
      const car = p.carId && safety.cars?.[p.carId];
      return [p.username, users[p.username]?.name || "", p.role, car ? `${car.year} ${car.make} ${car.model}` : "", p.checkedIn ? "yes" : "no"];
    })];
    shareText({ title: `${meet.title}: people`, text: rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n") });
  };
  const spots = meet.spots || [];

  return (
    <div data-testid="organizer-tools" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <SlidersHorizontal size={15} color={T.accent} />
        <span style={{ color: T.text, fontWeight: 800, fontSize: 14.5, flex: 1 }}>Organizer tools</span>
        {pro ? <PlanBadge meet={meet} /> : <span style={{ color: T.textDim, fontSize: 11.5 }}>Free plan</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          ["Driving", `${drivers.length}${caps.driver ? `/${caps.driver}` : ""}`],
          ["Attending", `${attending.length}${caps.attendee ? `/${caps.attendee}` : ""}`],
          ["Checked in", `${checked}/${people.length}`],
        ].map(([l, v]) => (
          <div key={l} style={{ textAlign: "center", padding: "9px 4px", borderRadius: 14, background: "rgba(255,255,255,0.04)" }}>
            <div className="plate" data-testid={`count-${l.replace(" ", "-").toLowerCase()}`} style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>{v}</div>
            <div style={{ color: T.textDim, fontSize: 10.5 }}>{l}</div>
          </div>
        ))}
      </div>
      {!pro && <div style={{ color: T.textDim, fontSize: 11.5, marginBottom: 10 }}>Free: up to {PLANS.free.maxPeople} people, {PLANS.free.coOrganizers} co-organizer, {PLANS.free.announcements} announcement.</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button data-testid="tool-checkin" onClick={doCheckIn} className="press" style={tool(false)}><ScanLine size={15} /> Check in</button>
        <button data-testid="tool-announce" onClick={() => setAnnouncing(true)} className="press" style={tool(annLeft === 0)}>
          <Megaphone size={15} /> Announce{annLeft !== null ? ` (${annLeft} left)` : ""}
        </button>
        <button data-testid="tool-manage" onClick={onManage} className="press" style={tool(false)}><SlidersHorizontal size={15} /> Manage people</button>
        <button data-testid="tool-stats" onClick={() => (pro ? setStats(true) : safety.flash("Stats are a Pro feature"))} className="press" style={tool(!pro)}>
          {pro ? <BarChart3 size={15} /> : <Lock size={14} />} Stats
        </button>
        <button data-testid="tool-export" onClick={exportList} className="press" style={tool(!pro)}>{pro ? <Download size={15} /> : <Lock size={14} />} Export list</button>
      </div>

      {meet.approveDrivers && (
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Drivers waiting · {pending.length}</SectionLabel>
          {pending.length === 0 && <div style={{ color: T.textDim, fontSize: 12.5 }}>No one waiting.</div>}
          {pending.map((p) => {
            const car = p.carId && safety.cars?.[p.carId];
            return (
              <div key={p.username} data-testid="pending-driver" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <Avatar username={p.username} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.text, fontSize: 13.5, fontWeight: 700 }}>@{p.username}</div>
                  <div style={{ color: T.textDim, fontSize: 11.5 }}>{car ? `${car.year} ${car.make} ${car.model}` : "No car picked yet"}</div>
                </div>
                <button aria-label={`Approve ${p.username}`} data-testid="approve" onClick={() => a.approveDriver(meet.id, p.username, true)} className="press" style={{ ...pill(true), display: "flex", alignItems: "center", gap: 4 }}><Check size={13} /> OK</button>
                <button aria-label={`Decline ${p.username}`} onClick={() => a.approveDriver(meet.id, p.username, false)} className="press" style={{ ...pill(false), display: "flex", alignItems: "center" }}><X size={13} /></button>
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet open={announcing} onClose={() => setAnnouncing(false)} title="Announcement" maxHeight="70vh">
        <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 10 }}>Everyone going gets a notification. {pro ? "One every 10 minutes." : "Free meets get 1."}</div>
        <TextArea value={text} onChange={setText} placeholder="e.g. Gate moved to the north entrance" maxLength={300} rows={3} maxLines={6} autoFocus />
        <button data-testid="send-announcement" disabled={!text.trim()} onClick={async () => { if (await a.announce(meet.id, text)) { setText(""); setAnnouncing(false); } }} className="press" style={{
          width: "100%", marginTop: 10, padding: 13, borderRadius: 16, border: "none", fontWeight: 700, fontSize: 15,
          background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim,
        }}>Send to everyone going</button>
      </BottomSheet>

      <BottomSheet open={stats} onClose={() => setStats(false)} title="Meet stats" maxHeight="70vh">
        <div data-testid="meet-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["Page views", meet.views || 0], ["Going", people.length], ["Driving", drivers.length], ["Attending", attending.length],
            ["Checked in", checked], ["Cars listed", drivers.filter((d) => d.carId).length], ["Spots", spots.length], ["Scanned spots", spots.filter((s) => s.verified).length],
          ].map(([l, v]) => (
            <div key={l} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.05)" }}>
              <div className="plate" style={{ color: T.text, fontSize: 20, fontWeight: 700 }}>{v}</div>
              <div style={{ color: T.textDim, fontSize: 11.5 }}>{l}</div>
            </div>
          ))}
        </div>
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
        <span style={{ color: T.text, fontWeight: 800, fontSize: 14.5, flex: 1 }}>You're driving</span>
        {mine.approved === false && <span data-testid="driver-pending" style={{ color: "#F2C76A", fontSize: 11.5, fontWeight: 700 }}>Waiting for OK</span>}
        {mine.checkedIn && <span style={{ color: "#7BD389", fontSize: 11.5, fontWeight: 700 }}>Checked in ✓</span>}
      </div>
      <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 8 }}>Which car are you bringing? It shows in "Cars at this meet".</div>
      {myCars.length === 0 ? <div style={{ color: T.textDim, fontSize: 12.5 }}>Add a car to your garage first.</div> : (
        <div data-testid="pick-my-car" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {myCars.map((c) => (
            <button key={c.id} onClick={() => safety.actions.setMeetCar(meet.id, mine.carId === c.id ? null : c.id)} className="press" style={pill(mine.carId === c.id)}>
              {c.nickname || `${c.make} ${c.model}`}
            </button>
          ))}
        </div>
      )}
      <button data-testid="my-pass" onClick={() => safety.openTag({ kind: "user", id: me, title: users[me]?.name || me, subtitle: `Driver pass · ${meet.title}` })} className="press" style={{ ...tool(false), width: "100%", marginTop: 12 }}>
        <QrCode size={15} /> Show my pass (for check-in)
      </button>
      {meet.driverNote && (
        <div data-testid="driver-note" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 14, background: "rgba(69,123,144,0.16)", color: T.text, fontSize: 13, lineHeight: 1.45, display: "flex", gap: 8 }}>
          <Info size={15} color="#8EC3D6" style={{ flexShrink: 0, marginTop: 1 }} /><div><b>For drivers:</b> {meet.driverNote}</div>
        </div>
      )}
    </div>
  );
}

// ---------- announcements ----------
export function Announcements({ meet }) {
  const list = meet.announcements || [];
  if (!list.length) return null;
  return (
    <div data-testid="announcements" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Megaphone size={15} color="#F2C76A" /><span style={{ color: T.text, fontWeight: 800, fontSize: 14.5 }}>Updates</span>
      </div>
      {list.map((x) => (
        <div key={x.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.lineDark}` }}>
          <div style={{ color: T.text, fontSize: 14, lineHeight: 1.45 }}>{x.text}</div>
          <div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>@{x.author} · {timeAgo(x.date)}</div>
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
    if (!t || t.kind !== "car") { safety.flash("Scan a car's tag"); return; }
    if (!list.some((c) => c.id === t.id)) { safety.flash("That car isn't listed at this meet"); return; }
    await safety.actions.spotAtMeet(meet.id, t.id, true);
  };
  return (
    <div data-testid="cars-at-meet" style={{ padding: "18px 0", borderTop: `1px solid ${T.lineDark}` }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={{ flex: 1 }}><SectionLabel>Cars at this meet · {list.length}</SectionLabel></div>
        {canSpot && list.length > 0 && <button data-testid="scan-car" onClick={scanCar} className="press" style={{ ...pill(false), display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}><ScanLine size={13} /> Scan a car</button>}
      </div>
      {list.length === 0 ? <div style={{ color: T.textDim, fontSize: 12.5 }}>Drivers' cars show here once they pick which car they're bringing.</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {list.map((c) => {
            const sp = spots.filter((s) => s.carId === c.id);
            const mine = mineSpotted(c.id);
            return (
              <div key={c.id} data-testid="meet-car" style={{ borderRadius: 16, overflow: "hidden", background: T.surface, border: `1px solid ${T.lineDark}` }}>
                <button onClick={() => openCar(c.id)} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", border: "none", padding: 0, background: c.photoUrl ? `url(${c.photoUrl}) center/cover` : "linear-gradient(135deg, rgba(230,56,70,0.3), rgba(20,20,22,1))" }}>
                  {!c.photoUrl && <Car size={28} color="rgba(245,244,242,0.4)" />}
                </button>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nickname || `${c.make} ${c.model}`}</div>
                  <div style={{ color: T.textDim, fontSize: 11, marginBottom: 6 }}>@{c.ownerUsername} · {sp.length} {sp.length === 1 ? "spot" : "spots"}</div>
                  {c.ownerUsername !== me && canSpot && (
                    <button data-testid="spot-at-meet" disabled={!!mine} onClick={() => safety.actions.spotAtMeet(meet.id, c.id, false)} className="press" style={{ ...pill(!mine), width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: mine ? 0.7 : 1 }}>
                      {mine ? (mine.verified ? <><BadgeCheck size={13} /> Scanned</> : <><Check size={13} /> Spotted</>) : <><MapPin size={13} /> Spot</>}
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

// ---------- Free vs Pro (shown on the meet form) ----------
export function PlanPicker({ value, onChange }) {
  const [compare, setCompare] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["free", "Free", "Friend groups"], ["pro", "Pro", "Clubs & organizers"]].map(([id, label, sub]) => (
          <button key={id} data-testid={`plan-${id}`} onClick={() => onChange(id)} className="press" style={{
            flex: 1, padding: "12px 10px", borderRadius: 16, textAlign: "left",
            border: `1px solid ${value === id ? (id === "pro" ? "#E0A93B" : T.accent) : T.lineDark}`,
            background: value === id ? (id === "pro" ? "rgba(242,199,106,0.12)" : "rgba(230,56,70,0.12)") : T.surface,
          }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 14.5 }}>{label}</div>
            <div style={{ color: T.textDim, fontSize: 11.5 }}>{sub}</div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ color: T.textDim, fontSize: 11.5 }}>Testing: no payment yet.</span>
        <button data-testid="compare-plans" onClick={() => setCompare(true)} style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: 12.5, fontWeight: 700 }}>Compare plans</button>
      </div>
      <BottomSheet open={compare} onClose={() => setCompare(false)} title="Free vs Pro" maxHeight="85vh">
        <div data-testid="plan-table" style={{ fontSize: 12.5 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 6, color: T.textDim, fontWeight: 700, paddingBottom: 6, borderBottom: `1px solid ${T.lineDark}` }}>
            <span /><span>Free</span><span style={{ color: "#F2C76A" }}>Pro</span>
          </div>
          {PLAN_FEATURES.map(([f, a, b]) => (
            <div key={f} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 6, padding: "8px 0", borderBottom: `1px solid ${T.lineDark}`, color: T.text }}>
              <span>{f}</span><span style={{ color: a === "—" ? T.textDim : T.text }}>{a}</span><span>{b}</span>
            </div>
          ))}
          <div style={{ color: T.textDim, fontSize: 11.5, marginTop: 10 }}>Safety stays free for everyone: report, block and organizer controls.</div>
        </div>
      </BottomSheet>
    </div>
  );
}
