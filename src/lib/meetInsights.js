// Numbers for a meet's organizers: who saw it, who came, when they arrived, what cars, who keeps coming back.
// Pure functions (no screens), so they're easy to test. Organizers themselves aren't counted.
import { occurrence } from "./meets";

export const SOURCE_LABELS = {
  meets: "Meets list", notification: "Notifications", tag: "Scanned the meet's tag", link: "A shared link",
  discover: "Discover", feed: "Feed", profile: "A profile", search: "Search", other: "Other",
};

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export function meetInsights(meet, { meets = {}, cars = {}, now = new Date() } = {}) {
  const people = meet.attendees || [];
  const organizers = new Set([meet.submittedBy, ...people.filter((p) => p.role === "organizer").map((p) => p.username)]);
  const going = people.filter((p) => !organizers.has(p.username) && p.approved !== false);
  const drivers = going.filter((p) => p.role === "driver");
  const checked = going.filter((p) => p.checkedIn);
  const { start } = occurrence(meet, now);
  const started = !!start && now >= start;

  // Views (one per person), without the organizers' own visits.
  const viewLog = (meet.viewLog || []).filter((v) => !organizers.has(v.user));
  const views = meet.viewLog ? viewLog.length : meet.views || 0;
  const sources = {};
  viewLog.forEach((v) => { sources[v.source || "other"] = (sources[v.source || "other"] || 0) + 1; });
  const sourceList = Object.entries(sources).map(([id, n]) => ({ id, n, pct: pct(n, viewLog.length) })).sort((a, b) => b.n - a.n);

  // RSVPs per day (the 10 days up to the meet, or up to today).
  const until = start && start < now ? start : now;
  const rsvpDays = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date(until.getFullYear(), until.getMonth(), until.getDate() - i);
    rsvpDays.push({ day: dayKey(d), date: d, n: 0 });
  }
  going.forEach((p) => {
    if (!p.joinedAt) return;
    const k = dayKey(new Date(p.joinedAt));
    const slot = rsvpDays.find((x) => x.day === k);
    if (slot) slot.n += 1;
  });

  // Arrivals in 15-minute slots, from the first check-in.
  const times = checked.map((p) => p.checkedInAt && new Date(p.checkedInAt)).filter(Boolean).sort((a, b) => a - b);
  const arrivals = [];
  if (times.length) {
    const first = new Date(Math.floor(times[0].getTime() / 900e3) * 900e3);
    times.forEach((t) => {
      const i = Math.floor((t - first) / 900e3);
      while (arrivals.length <= i) arrivals.push({ at: new Date(first.getTime() + arrivals.length * 900e3), n: 0 });
      arrivals[i].n += 1;
    });
  }
  const peak = arrivals.reduce((best, s) => (s.n > (best?.n || 0) ? s : best), null);

  // Cars there: drivers' cars plus cars spotted at the meet.
  const carIds = new Set([...drivers.map((p) => p.carId), ...(meet.spots || []).map((s) => s.carId)].filter(Boolean));
  const makes = {};
  carIds.forEach((id) => { const c = cars[id]; if (c) makes[c.make] = (makes[c.make] || 0) + 1; });
  const makeList = Object.entries(makes).map(([make, n]) => ({ make, n, pct: pct(n, carIds.size) })).sort((a, b) => b.n - a.n || a.make.localeCompare(b.make));
  const spotCount = {};
  (meet.spots || []).forEach((s) => { spotCount[s.carId] = (spotCount[s.carId] || 0) + 1; });
  const topSpotId = Object.keys(spotCount).sort((a, b) => spotCount[b] - spotCount[a])[0];
  const mostSpotted = topSpotId && cars[topSpotId] ? { car: cars[topSpotId], n: spotCount[topSpotId] } : null;

  // Regulars: people who were also going to this organizer's earlier meets.
  const earlier = Object.values(meets).filter((m) => m.id !== meet.id && m.submittedBy === meet.submittedBy && occurrence(m, now).start && start && occurrence(m, now).start < start);
  const regulars = going.map((p) => ({ username: p.username, times: earlier.filter((m) => (m.attendees || []).some((a) => a.username === p.username)).length }))
    .filter((r) => r.times > 0).sort((a, b) => b.times - a.times);

  return {
    views, going: going.length, drivers: drivers.length, attending: going.length - drivers.length,
    checkedIn: checked.length, started,
    showUpRate: pct(checked.length, going.length), goingFromViews: pct(going.length, views),
    sources: sourceList, rsvpDays, arrivals, peak,
    cars: carIds.size, makes: makeList, spots: (meet.spots || []).length, scannedSpots: (meet.spots || []).filter((s) => s.verified).length, mostSpotted,
    earlierMeets: earlier.length, regulars, newFaces: going.length - regulars.length,
    announcements: (meet.announcements || []).length,
  };
}

// The next start (and end) a week after the old one that's still in the future, for "Run it again".
export function nextWeekSlot(meet, now = new Date()) {
  const toLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const s = new Date(meet.when);
  if (Number.isNaN(s.getTime())) return { when: "", endWhen: "" };
  const len = meet.endWhen ? new Date(meet.endWhen) - s : 0;
  do s.setDate(s.getDate() + 7); while (s <= now);
  return { when: toLocal(s), endWhen: len > 0 ? toLocal(new Date(s.getTime() + len)) : "" };
}
