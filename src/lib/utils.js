// Small formatting and id helpers used across the app.

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
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
    return new Date(val).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  if (t.type === "created") return "added this car to Carfooly";
  if (t.type === "mod") return `added ${t.modName || t.detail || "a mod"}`;
  if (t.type === "spot") return "spotted this car";
  if (t.type === "post") return t.detail ? `posted: "${t.detail}"` : "posted a photo";
  if (t.type === "followBuild") return "started following this build";
  return "";
}

export function notifText(n) {
  if (n.type === "like") return "liked your post";
  if (n.type === "comment") return `commented: "${n.text}"`;
  if (n.type === "reply") return `replied: "${n.text}"`;
  if (n.type === "follow") return "started following you";
  if (n.type === "spot") return "spotted your car";
  if (n.type === "followBuild") return "started following your build";
  if (n.type === "commentLike") return "liked your comment";
  if (n.type === "tag") return "tagged you in a post";
  if (n.type === "threadReply") return `replied to your discussion: "${n.text}"`;
  return "";
}

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
