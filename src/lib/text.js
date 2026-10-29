// Text rules shared by typing, saving and showing.
// Line limits stop "one letter per line" walls of text; at most one empty line in a row.
export const MAX_LINES = { bio: 4, caption: 12, note: 20, body: 30, description: 4, report: 6 };

export function cleanText(s, maxLines) {
  if (!s) return "";
  let t = String(s).replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  if (maxLines) {
    const lines = t.split("\n");
    if (lines.length > maxLines) t = lines.slice(0, maxLines).join("\n") + " " + lines.slice(maxLines).filter(Boolean).join(" ");
  }
  return t;
}

// While typing or pasting: at most one empty line in a row, and lines past the limit are
// joined onto the last allowed line (so a pasted block isn't lost).
export function limitTyping(next, prev, maxLines) {
  let t = next.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  if (maxLines) {
    const lines = t.split("\n");
    if (lines.length > maxLines) t = lines.slice(0, maxLines).join("\n") + lines.slice(maxLines).map((l) => (l ? " " + l : "")).join("");
  }
  return t;
}

// Splits text into plain parts, @mentions and web links.
const TOKEN = /(@[a-zA-Z0-9_.]{2,24})|((?:https?:\/\/|www\.)[^\s<>"]+|\b[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.(?:com|net|org|io|app|sa|ae|co|me|uk|gg|shop|store|club|dev|info|biz|cars|auto|tv)(?:\/[^\s<>"]*)?)/g;
export function tokenize(text) {
  const out = [];
  let last = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    let raw = m[0];
    const start = m.index;
    // Don't treat emails (name@site.com) or the middle of a word as a mention.
    if (m[1] && start > 0 && /[\w@.]/.test(text[start - 1])) continue;
    if (m[2] && start > 0 && text[start - 1] === "@") continue;
    // Trailing punctuation belongs to the sentence, not the link/handle.
    const trail = raw.match(/[.,!?;:)\]'"]+$/);
    if (trail) raw = raw.slice(0, -trail[0].length);
    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    if (m[1]) out.push({ type: "mention", value: raw, handle: raw.slice(1).toLowerCase() });
    else out.push({ type: "link", value: raw, url: /^https?:\/\//i.test(raw) ? raw : `https://${raw}` });
    last = start + raw.length;
    TOKEN.lastIndex = last;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}
