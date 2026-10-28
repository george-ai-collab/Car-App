import { useState } from "react";
import { ShieldCheck, Trash2, Ban, Check, EyeOff } from "lucide-react";
import { T } from "../theme";
import { Avatar, EmptyState, ConfirmDialog } from "../components/ui";
import { timeAgo } from "../lib/utils";

const KIND_LABEL = { post: "Post", comment: "Comment", reply: "Reply", user: "Account", car: "Car", meet: "Meet", community: "Community", thread: "Discussion", threadReply: "Discussion reply" };

// Find the reported thing in the loaded data (admins also get hidden things).
function lookup(kind, id, d) {
  if (kind === "post") { const p = d.posts[id]; return p && { author: p.authorUsername, text: p.caption, photo: p.photoUrl, hidden: p.hidden }; }
  if (kind === "comment" || kind === "reply") {
    for (const p of Object.values(d.posts)) for (const c of p.comments) {
      if (c.id === id) return { author: c.author, text: c.text, hidden: c.hidden, context: `on @${p.authorUsername}'s post` };
      const r = (c.replies || []).find((x) => x.id === id);
      if (r) return { author: r.author, text: r.text, hidden: r.hidden, context: `reply on @${p.authorUsername}'s post` };
    }
    return null;
  }
  if (kind === "user") { const u = d.users[id]; return u && { author: id, text: u.bio || u.name, photo: u.avatar }; }
  if (kind === "thread") { const t = d.discussions[id]; return t && { author: t.author, text: `${t.title}${t.body ? `\n${t.body}` : ""}`, hidden: t.hidden }; }
  if (kind === "threadReply") { for (const t of Object.values(d.discussions)) { const r = t.replies.find((x) => x.id === id); if (r) return { author: r.author, text: r.text, hidden: r.hidden, context: `in "${t.title}"` }; } return null; }
  if (kind === "meet") { const m = d.meets[id]; return m && { author: m.submittedBy, text: `${m.title}${m.note ? `\n${m.note}` : ""}`, photo: m.cover }; }
  if (kind === "community") { const c = d.communities[id]; return c && { author: c.createdBy, text: `${c.name}${c.description ? `\n${c.description}` : ""}` }; }
  if (kind === "car") { const c = d.cars[id]; return c && { author: c.ownerUsername, text: c.nickname || `${c.year} ${c.make} ${c.model}`, photo: c.photoUrl }; }
  return null;
}

// Admins only: every reported thing, most-reported first. Keep (close the reports), Remove, or Ban the author.
export function AdminReports({ me, reports = [], data, onResolve, openProfile }) {
  const [confirm, setConfirm] = useState(null); // { kind, targetId, action, author }
  const groups = {};
  reports.forEach((r) => {
    const k = `${r.kind}:${r.targetId}`;
    (groups[k] ||= { kind: r.kind, targetId: r.targetId, reports: [] }).reports.push(r);
  });
  const list = Object.values(groups).sort((a, b) => b.reports.length - a.reports.length || (a.reports[0].date < b.reports[0].date ? 1 : -1));

  return (
    <div data-testid="admin-reports" style={{ paddingBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ShieldCheck size={20} color={T.accent} />
        <div className="display" style={{ fontSize: 22, color: T.text }}>Reports</div>
      </div>
      <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 16 }}>Only admins see this. Anything with 3 reports is hidden until you decide.</div>
      {list.length === 0 && <EmptyState icon={<Check size={20} color={T.textDim} />} title="All clear" body="No open reports." />}
      {list.map((g) => {
        const item = lookup(g.kind, g.targetId, data);
        const reasons = {};
        g.reports.forEach((r) => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
        const notes = g.reports.map((r) => r.note).filter(Boolean);
        return (
          <div key={`${g.kind}:${g.targetId}`} data-testid="report-card" style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="plate" style={{ fontSize: 10.5, fontWeight: 700, color: T.ink, background: T.paper, borderRadius: 5, padding: "2px 6px" }}>{KIND_LABEL[g.kind] || g.kind}</span>
              <span style={{ color: T.accent, fontSize: 12.5, fontWeight: 700 }}>{g.reports.length} {g.reports.length === 1 ? "report" : "reports"}</span>
              {item?.hidden && <span style={{ display: "flex", alignItems: "center", gap: 4, color: T.textDim, fontSize: 11.5 }}><EyeOff size={12} /> hidden</span>}
              <span style={{ marginLeft: "auto", color: T.textDim, fontSize: 11 }}>{timeAgo(g.reports[0].date)}</span>
            </div>
            {item ? (
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                {item.photo ? <img src={item.photo} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                  : <Avatar username={item.author} size={40} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => item.author && openProfile(item.author)} style={{ background: "none", border: "none", padding: 0, color: T.text, fontWeight: 700, fontSize: 13.5 }}>@{item.author}</button>
                  {item.context && <span style={{ color: T.textDim, fontSize: 11.5 }}> · {item.context}</span>}
                  {item.text && <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.4, marginTop: 3, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 120, overflow: "hidden" }}>{item.text}</div>}
                </div>
              </div>
            ) : <div style={{ color: T.textDim, fontSize: 13, marginBottom: 10 }}>This was already deleted.</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: notes.length ? 8 : 12 }}>
              {Object.entries(reasons).map(([r, n]) => (
                <span key={r} style={{ fontSize: 11.5, color: T.text, background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "4px 9px" }}>{r}{n > 1 ? ` ×${n}` : ""}</span>
              ))}
            </div>
            {notes.length > 0 && <div style={{ color: T.textDim, fontSize: 12, lineHeight: 1.4, marginBottom: 12 }}>{notes.map((n, i) => <div key={i}>“{n}”</div>)}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <button data-testid="admin-keep" onClick={() => onResolve(g.kind, g.targetId, "keep")} className="press" style={btn(false)}><Check size={14} /> Keep</button>
              {item && g.kind !== "user" && <button data-testid="admin-remove" onClick={() => setConfirm({ ...g, action: "remove", author: item.author })} className="press" style={btn(true)}><Trash2 size={14} /> Remove</button>}
              {item?.author && item.author !== me && (
                <button data-testid="admin-ban" onClick={() => setConfirm({ ...g, action: "ban", author: item.author })} className="press" style={btn(true)}><Ban size={14} /> Ban</button>
              )}
            </div>
          </div>
        );
      })}
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.action === "ban" ? `Ban @${confirm?.author}?` : "Remove this?"}
        confirmLabel={confirm?.action === "ban" ? "Ban" : "Remove"}
        body={confirm?.action === "ban" ? `This removes it and stops @${confirm?.author} from posting, commenting or liking.` : "It's deleted for everyone. This can't be undone."}
        onConfirm={() => { onResolve(confirm.kind, confirm.targetId, confirm.action); setConfirm(null); }} />
    </div>
  );
}

const btn = (danger) => ({
  flex: 1, padding: "10px 8px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 13, fontWeight: 700,
  border: `1px solid ${danger ? "rgba(230,56,70,0.5)" : T.lineDark}`, background: danger ? "rgba(230,56,70,0.12)" : "transparent", color: danger ? T.accent : T.text,
});
