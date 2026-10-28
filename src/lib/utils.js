import { tr, locale } from "./i18n";
// Small formatting and id helpers used across the app.

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(locale(), { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return tr("just now");
  if (mins < 60) return tr("{0}m ago", mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tr("{0}h ago", hrs);
  const days = Math.floor(hrs / 24);
  if (days < 30) return tr("{0}d ago", days);
  return fmtDate(iso);
}

export function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

// Meet times are stored as local "YYYY-MM-DDTHH:mm" strings.
export function fmtWhen(val) {
  if (!val) return "";
  try {
    return new Date(val).toLocaleString(locale(), { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return val; }
}

export function isPast(val) {
  if (!val) return false;
  const t = new Date(val).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

export function hueForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function verbPhrase(t) {
  if (t.type === "created") return tr("added this car to Carfooly");
  if (t.type === "mod") return tr("added {0}", t.modName || t.detail || "a mod");
  if (t.type === "spot") return t.detail ? tr("spotted this car {0}", t.detail) : tr("spotted this car");
  if (t.type === "post") return t.detail ? tr("posted: \"{0}\"", t.detail) : tr("posted a photo");
  if (t.type === "followBuild") return tr("started following this build");
  return "";
}

export function notifText(n) {
  if (n.type === "like") return tr("liked your post");
  if (n.type === "comment") return tr("commented: \"{0}\"", n.text);
  if (n.type === "reply") return tr("replied: \"{0}\"", n.text);
  if (n.type === "follow") return tr("started following you");
  if (n.type === "spot") return tr("spotted your car");
  if (n.type === "followBuild") return tr("started following your build");
  if (n.type === "commentLike") return tr("liked your comment");
  if (n.type === "tag") return tr("tagged you in a post");
  if (n.type === "threadReply") return tr("replied to your discussion: \"{0}\"", n.text);
  if (n.type === "meetUpdate") return tr("meet update: \"{0}\"", n.text);
  return "";
}

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
