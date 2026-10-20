import { useState } from "react";
import { Car, Image as ImageIcon, Heart, MessageCircle, Check, Plus, MessagesSquare, Shield, Crown, Trash2, Pencil } from "lucide-react";
import { T } from "../theme";
import { hueForId, timeAgo } from "../lib/utils";
import { useSwipe } from "../lib/useSwipe";
import { MoreMenu, ReportSheet, useSafety } from "../components/Safety";
import { Avatar, EmptyState, Field, TextInput, TextArea, SectionLabel, Segmented, ConfirmDialog, BottomSheet } from "../components/ui";

export function CommunityCard({ community, me, onToggle, onOpen, compact }) {
  const joined = community.members.includes(me);
  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
        <button onClick={() => onOpen(community.id)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, background: "none", border: "none", padding: 0, textAlign: "left" }}>
          <Avatar username={community.name} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{community.name}</div>
            <div style={{ color: T.textDim, fontSize: 12 }}>{community.members.length} {community.members.length === 1 ? "member" : "members"}</div>
          </div>
        </button>
        <button onClick={() => onToggle(community.id)} className="press" style={{
          padding: "7px 14px", borderRadius: 999, border: `1px solid ${joined ? T.lineDark : T.accent}`,
          background: joined ? "transparent" : T.accent, color: joined ? T.text : "#fff", fontSize: 12.5, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
        }}>
          {joined && <Check size={12} />} {joined ? "Joined" : "Join"}
        </button>
      </div>
    );
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10,
      background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, boxShadow: T.shadowCard,
    }}>
      <button onClick={() => onOpen(community.id)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, background: "none", border: "none", padding: 0, textAlign: "left" }}>
        <Avatar username={community.name} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>{community.name}</div>
          <div style={{ color: T.textDim, fontSize: 12, marginTop: 1 }}>
            {community.members.length} {community.members.length === 1 ? "member" : "members"}
            {community.description ? ` · ${community.description}` : ""}
          </div>
        </div>
      </button>
      <button onClick={() => onToggle(community.id)} className="press" style={{
        padding: "7px 14px", borderRadius: 999, border: `1px solid ${joined ? T.lineDark : T.accent}`,
        background: joined ? "transparent" : T.accent, color: joined ? T.text : "#fff", fontSize: 12.5, fontWeight: 600,
        display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", boxShadow: joined ? "none" : T.shadowAccent,
      }}>
        {joined && <Check size={12} />} {joined ? "Joined" : "Join"}
      </button>
    </div>
  );
}

export function CommunityPostRow({ post, car, onOpenPost, onOpenCar, onOpenProfile }) {
  const hue = hueForId(post.id);
  return (
    <button onClick={() => onOpenPost(post.id)} style={{
      display: "flex", gap: 10, width: "100%", background: T.surface, border: `1px solid ${T.lineDark}`,
      borderRadius: 16, padding: 10, marginBottom: 10, textAlign: "left", boxShadow: T.shadowCard,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12, flexShrink: 0, overflow: "hidden",
        background: post.photoUrl ? `url(${post.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${hue},35%,14%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {!post.photoUrl && <Car size={18} color="rgba(245,244,242,0.5)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.text, fontSize: 12.5, fontWeight: 700 }}>{post.authorUsername}</div>
        {car && <div style={{ color: T.accent2, fontSize: 11, marginTop: 1 }}>{car.make} {car.model} '{car.year}</div>}
        {post.caption && <div style={{ color: T.textDim, fontSize: 12, marginTop: 3, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.caption}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: T.textDim }}><Heart size={11} /> {post.likes.length}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: T.textDim }}><MessageCircle size={11} /> {post.comments.length}</span>
        </div>
      </div>
    </button>
  );
}

// Engagement decides tile size in the Posts mosaic (likes + comments count double).
const score = (p) => p.likes.length + 2 * p.comments.length;

export function CommunityPage({ community, me, users, cars, posts, discussions, onToggle, openPost, openProfile, openThread, onNewThread, onNewPost, tab = "posts", setTab, onEdit, onDelete }) {
  const joined = community.members.includes(me);
  const safety = useSafety();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const isOwner = community.kind === "custom" && community.createdBy === me;
  const hidden = safety?.prefs.hidden || [], blocked = safety?.prefs.blocked || [];
  const order = ["posts", "discuss", "people"];
  const sw = useSwipe({
    onLeft: () => setTab(order[Math.min(order.length - 1, order.indexOf(tab) + 1)]),
    onRight: () => setTab(order[Math.max(0, order.indexOf(tab) - 1)]),
  });
  const cPosts = Object.values(posts).filter((p) => p.communityId === community.id && !p.archived && !hidden.includes(p.id) && !blocked.includes(p.authorUsername)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const threads = Object.values(discussions || {}).filter((t) => t.communityId === community.id && !blocked.includes(t.author))
    .sort((a, b) => new Date(b.replies.at(-1)?.date || b.date) - new Date(a.replies.at(-1)?.date || a.date));

  return (
    <div {...sw.bind} style={{ ...sw.bind.style, paddingBottom: 10, minHeight: "75vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <Avatar username={community.name} size={60} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display" style={{ fontSize: 21, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{community.name}</div>
          <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 2 }}>{community.members.length} {community.members.length === 1 ? "member" : "members"}{community.kind === "brand" ? " · brand" : ""}</div>
        </div>
        <button onClick={() => onToggle(community.id)} className="press" style={{
          padding: "8px 16px", borderRadius: 999, border: `1px solid ${joined ? T.lineDark : T.accent}`,
          background: joined ? "transparent" : T.accent, color: joined ? T.text : "#fff",
          fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
          boxShadow: joined ? "none" : T.shadowAccent,
        }}>
          {joined && <Check size={12} />} {joined ? "Joined" : "Join"}
        </button>
        {safety && (
          <MoreMenu label="Community options" testid="community-menu" flash={safety.flash}
            share={{ title: community.name, text: `Join ${community.name} on Carfooly` }}
            items={isOwner ? [
              { label: "Edit community", icon: <Pencil size={17} />, onClick: () => setEditing(true) },
              { label: "Delete community", icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
            ] : []}
            report={isOwner ? null : { what: "community", onSend: (reason, note) => safety.actions.report({ kind: "community", id: community.id, reason, note }) }} />
        )}
      </div>
      {community.description && <div style={{ color: T.textDim, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{community.description}</div>}
      {isOwner && <EditCommunitySheet open={editing} onClose={() => setEditing(false)} community={community} onSave={onEdit} />}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title={`Delete ${community.name}?`}
        body="Its discussions are removed. Posts stay on people's profiles and the feed, just without this community." onConfirm={() => onDelete(community.id)} />

      <Segmented testid="community-tabs" value={tab} onChange={setTab} options={[["posts", "Posts"], ["discuss", "Discuss"], ["people", "People"]]} />

      {tab === "posts" && (
        <>
          <button onClick={onNewPost} className="press" style={dashedBtn}><Plus size={14} /> Post to {community.name}</button>
          {cPosts.length === 0
            ? <EmptyState icon={<ImageIcon size={20} color={T.textDim} />} title="No posts yet" body="Post a photo of your car here and it shows up for everyone in the community." />
            : <Mosaic posts={cPosts} openPost={openPost} />}
        </>
      )}

      {tab === "discuss" && (
        <>
          <button onClick={onNewThread} className="press" style={dashedBtn}><Plus size={14} /> Start a discussion</button>
          {threads.length === 0
            ? <EmptyState icon={<MessagesSquare size={20} color={T.textDim} />} title="No discussions yet" body="Ask about a mod, share an opinion, plan a drive." />
            : threads.map((t) => <ThreadCard key={t.id} thread={t} me={me} onOpen={openThread} />)}
        </>
      )}

      {tab === "people" && <People community={community} users={users} posts={cPosts} threads={threads} openProfile={openProfile} />}
    </div>
  );
}

const dashedBtn = {
  width: "100%", marginBottom: 14, padding: "11px 14px", borderRadius: 16, border: `1px dashed ${T.lineDark}`,
  background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};

function EditCommunitySheet({ open, onClose, community, onSave }) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || "");
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit community" maxHeight="80vh">
      <Field label="Name"><TextInput value={name} onChange={setName} maxLength={40} /></Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} maxLength={150} rows={3} /></Field>
      <button disabled={!name.trim()} onClick={async () => { if (await onSave(community.id, { name, description })) onClose(); }} className="press" style={{ width: "100%", padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15 }}>Save</button>
    </BottomSheet>
  );
}

// Instagram-explore style grid: the most-liked/commented posts get big tiles.
function Mosaic({ posts, openPost }) {
  const ranked = [...posts].sort((a, b) => score(b) - score(a));
  const bigCount = Math.min(3, Math.ceil(posts.length / 5));
  const big = new Set(ranked.slice(0, bigCount).filter((p) => score(p) >= 2).map((p) => p.id));
  return (
    <div data-testid="mosaic" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "clamp(96px, calc((100vw - 44px) / 3), 145px)", gridAutoFlow: "dense", gap: 6 }}>
      {posts.map((p, i) => {
        const isBig = big.has(p.id);
        const hue = hueForId(p.id);
        // Alternate big tiles left and right, like your sketch.
        const col = isBig ? ([...big].indexOf(p.id) % 2 === 0 ? "2 / span 2" : "1 / span 2") : undefined;
        return (
          <button key={p.id} data-testid={isBig ? "tile-big" : "tile"} onClick={() => openPost(p.id)} style={{
            gridColumn: col, gridRow: isBig ? "span 2" : undefined,
            position: "relative", borderRadius: 14, overflow: "hidden", border: "none", padding: 0,
            background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,24%), hsl(${hue},35%,12%))`,
          }}>
            {!p.photoUrl && <span style={{ position: "absolute", inset: 8, color: "#fff", fontSize: isBig ? 15 : 11.5, fontWeight: 600, textAlign: "left", overflow: "hidden", lineHeight: 1.35 }}>{p.caption || ""}</span>}
            {isBig && (
              <span style={{ position: "absolute", left: 8, bottom: 8, display: "flex", gap: 8, color: "#fff", fontSize: 12, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart size={12} fill="#fff" /> {p.likes.length}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MessageCircle size={12} /> {p.comments.length}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ThreadCard({ thread, me, onOpen }) {
  return (
    <button data-testid="thread-card" onClick={() => onOpen(thread.id)} className="press" style={{
      width: "100%", textAlign: "left", padding: 14, marginBottom: 10, borderRadius: 20,
      background: T.surface, border: `1px solid ${T.lineDark}`, boxShadow: T.shadowCard,
    }}>
      <div style={{ color: T.text, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{thread.title}</div>
      {thread.body && <div style={{ color: T.textDim, fontSize: 13, lineHeight: 1.45, marginTop: 5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{thread.body}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, color: T.textDim, fontSize: 11.5 }}>
        <Avatar username={thread.author} size={18} />
        <span style={{ color: T.text, fontWeight: 600 }}>{thread.author}</span>
        <span>· {timeAgo(thread.date)}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart size={11} color={thread.likes.includes(me) ? T.accent : T.textDim} fill={thread.likes.includes(me) ? T.accent : "none"} /> {thread.likes.length}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MessageCircle size={11} /> {thread.replies.length}</span>
      </div>
    </button>
  );
}

// Moderators + most active members.
function People({ community, users, posts, threads, openProfile }) {
  const mods = community.kind === "custom" ? [community.createdBy].filter(Boolean) : community.members.slice(0, 1);
  const counts = {};
  const bump = (u, k) => { counts[u] = counts[u] || { posts: 0, talk: 0 }; counts[u][k]++; };
  posts.forEach((p) => bump(p.authorUsername, "posts"));
  threads.forEach((t) => { bump(t.author, "talk"); t.replies.forEach((r) => bump(r.author, "talk")); });
  const top = Object.entries(counts).sort((a, b) => (b[1].posts + b[1].talk) - (a[1].posts + a[1].talk)).slice(0, 5);
  const row = (u, right) => (
    <button key={u} onClick={() => openProfile(u)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "8px 0", textAlign: "left" }}>
      <Avatar username={u} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{users[u]?.name || u}</div>
        <div className="plate" style={{ color: T.textDim, fontSize: 10.5 }}>@{u}</div>
      </div>
      {right}
    </button>
  );
  return (
    <div data-testid="people">
      <SectionLabel>{community.kind === "custom" ? "Moderators" : "Founding member"}</SectionLabel>
      {mods.length ? mods.map((u) => row(u, <span style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontSize: 11.5, fontWeight: 700 }}><Shield size={12} /> Mod</span>)) : <div style={{ color: T.textDim, fontSize: 13 }}>None yet.</div>}
      <div style={{ height: 14 }} />
      <SectionLabel>Top contributors</SectionLabel>
      {top.length === 0 ? <div style={{ color: T.textDim, fontSize: 13 }}>Nobody has posted yet.</div> : top.map(([u, c], i) => row(u,
        <span style={{ color: T.textDim, fontSize: 11.5, textAlign: "right" }}>{i === 0 && <Crown size={12} color={T.accentWarm} style={{ marginRight: 4, verticalAlign: "-2px" }} />}{c.posts} posts · {c.talk} in discuss</span>))}
      <div style={{ height: 14 }} />
      <SectionLabel>Members · {community.members.length}</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {community.members.slice(0, 40).map((u) => (
          <button key={u} onClick={() => openProfile(u)} aria-label={u} style={{ background: "none", border: "none", padding: 0 }}><Avatar username={u} size={34} /></button>
        ))}
      </div>
    </div>
  );
}

// A single discussion with its replies.
export function ThreadPage({ thread, community, me, onReply, onLike, onDelete, openProfile, onGone, onEdit, onDeleteReply }) {
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const [body, setBody] = useState(thread.body || "");
  const [reportReply, setReportReply] = useState(null);
  const safety = useSafety();
  const blocked = safety?.prefs.blocked || [];
  const liked = thread.likes.includes(me);
  return (
    <div style={{ paddingBottom: 10 }}>
      {community && <div className="plate" style={{ color: T.accent, fontSize: 10.5, marginBottom: 8 }}>{community.name} · Discuss</div>}
      <div className="display" style={{ fontSize: 22, color: T.text, lineHeight: 1.2 }}>{thread.title}</div>
      <button onClick={() => openProfile(thread.author)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, marginTop: 10 }}>
        <Avatar username={thread.author} size={26} />
        <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{thread.author}</span>
        <span style={{ color: T.textDim, fontSize: 12 }}>· {timeAgo(thread.date)}</span>
      </button>
      {thread.body && <div style={{ color: T.text, fontSize: 14.5, lineHeight: 1.55, marginTop: 14, whiteSpace: "pre-wrap" }}>{thread.body}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", margin: "14px 0", borderTop: `1px solid ${T.lineDark}`, borderBottom: `1px solid ${T.lineDark}` }}>
        <button onClick={() => onLike(thread.id)} aria-label="Like discussion" style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 6, color: T.textDim, fontSize: 13 }}>
          <Heart size={18} color={liked ? T.accent : T.textDim} fill={liked ? T.accent : "none"} /> {thread.likes.length}
        </button>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: T.textDim, fontSize: 13 }}><MessageCircle size={18} /> {thread.replies.length}</span>
        <span style={{ flex: 1 }} />
        {safety && (
          <MoreMenu label="Discussion options" testid="thread-menu" flash={safety.flash}
            share={{ title: thread.title, text: `"${thread.title}" in ${community?.name || "a community"} on Carfooly` }}
            items={thread.author === me ? [
              { label: "Edit discussion", icon: <Pencil size={17} />, onClick: () => { setTitle(thread.title); setBody(thread.body || ""); setEditing(true); } },
              { label: "Delete discussion", icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
            ] : []}
            report={thread.author === me ? null : { what: "discussion", onSend: (reason, note) => safety.actions.report({ kind: "thread", id: thread.id, reason, note }) }}
            block={thread.author === me ? null : { handle: thread.author, blocked: blocked.includes(thread.author), onToggle: () => safety.actions.toggleBlock(thread.author) }} />
        )}
      </div>
      {thread.replies.length === 0 && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 14 }}>No replies yet. Start it off.</div>}
      {thread.replies.filter((r) => !blocked.includes(r.author)).map((r) => (
        <div key={r.id} data-testid="thread-reply" style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={() => openProfile(r.author)} style={{ background: "none", border: "none", padding: 0 }}><Avatar username={r.author} size={30} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ color: T.text, fontWeight: 700 }}>{r.author}</span> <span style={{ color: T.textDim }}>· {timeAgo(r.date)}</span>
              <span style={{ flex: 1 }} />
              {r.author === me
                ? <button onClick={() => onDeleteReply(thread.id, r.id)} style={{ background: "none", border: "none", padding: 0, color: T.textDim, fontSize: 11, fontWeight: 600 }}>Delete</button>
                : <button onClick={() => setReportReply(r.id)} style={{ background: "none", border: "none", padding: 0, color: T.textDim, fontSize: 11, fontWeight: 600 }}>Report</button>}
            </div>
            <div style={{ color: T.text, fontSize: 14, lineHeight: 1.45, marginTop: 2, whiteSpace: "pre-wrap" }}>{r.text}</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}><TextInput value={text} onChange={setText} placeholder="Add to the discussion…" maxLength={500} /></div>
        <button disabled={!text.trim()} onClick={() => { onReply(thread.id, text); setText(""); }} className="press"
          style={{ padding: "0 16px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 600 }}>
          Reply
        </button>
      </div>
      {safety && <ReportSheet open={!!reportReply} onClose={() => setReportReply(null)} what="reply" onSend={(reason, note) => safety.actions.report({ kind: "threadReply", id: reportReply, reason, note })} />}
      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Edit discussion" maxHeight="85vh">
        <Field label="Title"><TextInput value={title} onChange={setTitle} maxLength={100} /></Field>
        <Field label="Details"><TextArea value={body} onChange={setBody} maxLength={1000} rows={5} /></Field>
        <button disabled={!title.trim()} onClick={async () => { await onEdit(thread.id, { title, body }); setEditing(false); }} className="press" style={{ width: "100%", padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15 }}>Save</button>
      </BottomSheet>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete this discussion?" body="The discussion and all its replies will be removed." onConfirm={async () => { await onDelete(thread.id); onGone(); }} />
    </div>
  );
}

export function NewThreadForm({ community, onSubmit }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Start a discussion</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>In {community.name}. New mods, opinions, questions, plans.</div>
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="e.g. Best coilovers for daily + track?" maxLength={100} /></Field>
      <Field label="Details (optional)"><TextArea value={body} onChange={setBody} placeholder="Add context, your setup, what you've tried…" maxLength={1000} rows={6} /></Field>
      <button disabled={!title.trim() || busy} className="press" onClick={async () => { setBusy(true); await onSubmit({ title, body }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: title.trim() ? T.accent : T.surface2, color: title.trim() ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15 }}>
        {busy ? "Posting…" : "Post discussion"}
      </button>
    </div>
  );
}

export function CreateCommunityForm({ onSubmit }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false);
  const valid = name.trim();
  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Start a community</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>A model, a scene, a local meet crowd — whatever people can gather around.</div>
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="e.g. R34 GT-R, JDM, Cars & Coffee QA" maxLength={40} /></Field>
      <Field label="Description (optional)"><TextInput value={description} onChange={setDescription} placeholder="What's it about?" maxLength={150} /></Field>
      <button disabled={!valid || busy}
        onClick={async () => { setBusy(true); await onSubmit({ name, description }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
