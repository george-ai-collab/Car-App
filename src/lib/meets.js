import { tr } from "./i18n";
// Meet timing, ordering and plans. Times are "YYYY-MM-DDTHH:MM" in local time (as picked).

export const DEFAULT_HOURS = 4;          // no end time given: assume 4 hours
export const RECENT_DAYS = 7;            // ended meets stay under "Recently ended" for a week

const pad = (n) => String(n).padStart(2, "0");
export const toLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const at = (s) => (s ? new Date(s) : null);

// Weekly meets roll forward to their next date once a week has ended.
export function occurrence(meet, now = new Date()) {
  const start = at(meet.when);
  if (!start || Number.isNaN(start.getTime())) return { start: null, end: null };
  let end = at(meet.endWhen) || new Date(start.getTime() + DEFAULT_HOURS * 3600e3);
  if (end <= start) end = new Date(start.getTime() + DEFAULT_HOURS * 3600e3);
  let s = start, e = end;
  if (meet.recurring === "weekly") {
    const week = 7 * 24 * 3600e3;
    while (e < now) { s = new Date(s.getTime() + week); e = new Date(e.getTime() + week); }
  }
  return { start: s, end: e };
}

// "upcoming" | "live" | "ended"
export function meetStatus(meet, now = new Date()) {
  const { start, end } = occurrence(meet, now);
  if (!start) return "upcoming";
  if (now < start) return "upcoming";
  if (now < end) return "live";
  return "ended";
}

export const hoursBetween = (a, b) => Math.round((at(b) - at(a)) / 36e5);

// Lists on the Meets page:
//  Happening now / Today / This weekend / This week / Later — inside each: Featured (Pro) first,
//  then the most interest (friends going counts most), then the soonest.
//  Recently ended: the last 7 days.
export function groupMeets(meets, { me, users = {}, now = new Date() } = {}) {
  const following = new Set(users[me]?.following || []);
  const score = (m) => {
    const going = (m.attendees || []).filter((a) => a.role !== "organizer");
    const friends = going.filter((a) => following.has(a.username)).length;
    return friends * 3 + going.length;
  };
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = day(now);
  const weekEnd = today + 7 * 864e5;
  // "This weekend": the coming Friday, Saturday or Sunday (covers Fri–Sat and Sat–Sun weekends).
  const isWeekend = (d) => [5, 6, 0].includes(d.getDay());
  const buckets = { live: [], today: [], weekend: [], week: [], later: [], recent: [] };
  Object.values(meets).forEach((m) => {
    const st = meetStatus(m, now);
    const { start, end } = occurrence(m, now);
    const item = { ...m, _start: start, _end: end, _status: st, _score: score(m) };
    if (st === "live") buckets.live.push(item);
    else if (st === "ended") { if (end && now - end < RECENT_DAYS * 864e5) buckets.recent.push(item); }
    else if (!start) buckets.later.push(item);
    else if (day(start) === today) buckets.today.push(item);
    else if (day(start) < weekEnd && isWeekend(start)) buckets.weekend.push(item);
    else if (day(start) < weekEnd) buckets.week.push(item);
    else buckets.later.push(item);
  });
  const feat = (m) => (m.featured && m.plan === "pro" ? 1 : 0);
  const order = (a, b) => feat(b) - feat(a) || b._score - a._score || (a._start || 0) - (b._start || 0);
  Object.keys(buckets).forEach((k) => buckets[k].sort(k === "recent" ? (a, b) => b._end - a._end : order));
  return [
    ["live", tr("Happening now")], ["today", tr("Today")], ["weekend", tr("This weekend")], ["week", tr("This week")], ["later", tr("Later")], ["recent", tr("Recently ended")],
  ].map(([id, label]) => ({ id, label, meets: buckets[id] })).filter((g) => g.meets.length);
}

// ---------- plans (no payments yet: organizers pick one while we test) ----------
export const PLANS = {
  free: { maxPeople: 50, coOrganizers: 1, announcements: 1 },
  pro: { maxPeople: null, coOrganizers: null, announcements: null },
};
export const PLAN_FEATURES = [
  // [feature, free, pro]
  [tr("Meet page, map, cover photo"), "✓", "✓"],
  [tr("Driving / Attending RSVPs"), tr("Up to 50 people"), tr("Unlimited")],
  ["Co-organizers", "1", tr("Unlimited")],
  [tr("Cars at the meet + spotting"), "✓", "✓"],
  [tr("Check-in by scanning tags"), "✓", tr("✓ with live counts")],
  [tr("Announcements to everyone going"), "1", tr("Unlimited")],
  [tr("Sponsors"), "—", "✓"],
  [tr("Approve drivers"), "—", "✓"],
  [tr("Repeats every week"), "—", "✓"],
  [tr("Featured in Local (labelled)"), "—", "✓"],
  [tr("Stats: views, RSVPs, check-ins"), "—", "✓"],
  [tr("Export the attendee list"), "—", "✓"],
];
export const isPro = (meet) => meet?.plan === "pro";
