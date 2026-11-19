import { useState } from "react";
import { Car, Image as ImageIcon, Heart, MessageCircle, Check, Plus, MessagesSquare, Shield, Crown, Trash2, Pencil, Layers, Clock, UserPlus, UserMinus, X, MoreHorizontal, BadgeCheck, Lock, Users, Play, Flame, Sparkles } from "lucide-react";
import { T } from "../theme";
import { hueForId, timeAgo } from "../lib/utils";
import { useSwipe } from "../lib/useSwipe";
import { MoreMenu, ReportSheet, useSafety } from "../components/Safety";
import { Avatar, EmptyState, Field, TextInput, TextArea, SectionLabel, Segmented, ConfirmDialog, BottomSheet, TabSlide } from "../components/ui";
import { MAX_LINES } from "../lib/text";
import { RichText } from "../components/RichText";
import { tr , AT } from "../lib/i18n";
import { CrewChat } from "./CrewChat";
import { roleIn, isGroupAdmin } from "../lib/chat";
import { BannerPicker, ProfileBanner } from "../components/BannerPicker";
import { AvatarPicker } from "./Settings";

// "Join" / "Joined", or for groups that approve members: "Ask to join" / "Requested".
export function joinState(c, me) {
  if (c.kind === "custom" && c.createdBy === me) return "owner";
  if (c.members.includes(me)) return "joined";
  if ((c.requests || []).includes(me)) return "requested";
  return c.kind === "custom" && c.joinMode === "approval" ? "ask" : "join";
}
const JOIN_LABEL = { owner: "Your community", joined: "Joined", requested: "Requested", ask: "Ask to join", join: "Join" };

// A community's picture: its photo, or its initials on a colour of its own.
export function CommunityAvatar({ c, size = 40, ring }) {
  const hue = hueForId(c.id || c.name || "?");
  const r = Math.round(size * 0.3);
  const box = { width: size, height: size, borderRadius: r, flexShrink: 0, ...(ring ? { border: `3px solid ${T.bg}`, boxShadow: "0 6px 18px rgba(0,0,0,0.45)" } : {}) };
  if (c.avatar) return <img data-testid="community-avatar" src={c.avatar} alt="" style={{ ...box, objectFit: "cover", display: "block", background: T.surface2 }} />;
  const initials = (c.name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div data-testid="community-avatar" style={{ ...box, background: `linear-gradient(140deg, hsl(${hue},55%,38%), hsl(${(hue + 40) % 360},45%,20%))`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: size * 0.36, letterSpacing: "0.02em" }}>
      {initials}
    </div>
  );
}
const kindChip = (c) => c.kind === "brand"
  ? <span data-testid="official-chip" style={chipStyle(T.accentWarm)}><BadgeCheck size={11} /> {tr("Official")}</span>
  : c.joinMode === "approval" ? <span style={chipStyle(T.accent2)}><Lock size={10} /> {tr("Approval to join")}</span> : null;
const chipStyle = (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${T.lineDark}` });
function JoinButton({ state, onClick, big }) {
  if (state === "owner") return <span data-testid="join-button" style={{ padding: big ? "8px 14px" : "6px 12px", borderRadius: 999, background: "rgba(203,176,131,0.14)", color: T.accentWarm, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><Crown size={12} /> {tr("Owner")}</span>;
  const joined = state === "joined" || state === "requested";
  return (
    <button data-testid="join-button" onClick={onClick} className="press" style={{
      padding: big ? "9px 18px" : "7px 14px", borderRadius: 999, border: `1px solid ${joined ? T.lineDark : T.accent}`,
      background: joined ? "transparent" : T.accent, color: joined ? T.text : "#fff", fontSize: 12.5, fontWeight: 700,
      display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", boxShadow: joined ? "none" : T.shadowAccent,
    }}>
      {state === "joined" && <Check size={12} />}{state === "requested" && <Clock size={12} />} {tr(JOIN_LABEL[state])}
    </button>
  );
}
// A few member faces, like "who's in it".
function FacePile({ members, size = 22 }) {
  const shown = members.slice(0, 5);
  if (!shown.length) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {shown.map((u, i) => <span key={u} style={{ marginInlineStart: i ? -size * 0.35 : 0, borderRadius: 999, border: `2px solid ${T.bg}`, display: "inline-flex" }}><Avatar username={u} size={size} /></span>)}
    </span>
  );
}

export function CommunityCard({ community, me, onToggle, onOpen, compact }) {
  const state = joinState(community, me);
  const joined = state === "joined" || state === "requested";
  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
        <button onClick={() => onOpen(community.id)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, background: "none", border: "none", padding: 0, textAlign: "start" }}>
          <CommunityAvatar c={community} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{community.name}</div>
            <div style={{ color: T.textDim, fontSize: 12 }}>{community.members.length} {community.members.length === 1 ? tr("member") : tr("members")}</div>
          </div>
        </button>
        <JoinButton state={state} onClick={() => onToggle(community.id)} />
      </div>
    );
  }
  // A card with the community's banner across the top and its photo on it.
  const hue = hueForId(community.id || community.name);
  return (
    <div data-testid="community-card" style={{ marginBottom: 12, background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, boxShadow: T.shadowCard, overflow: "hidden" }}>
      <button onClick={() => onOpen(community.id)} style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, textAlign: "start" }}>
        <div style={{ height: 64, background: community.banner ? `url(${community.banner}) center/cover` : `radial-gradient(120% 160% at 85% 0%, hsla(${hue},55%,45%,0.55), transparent 60%), linear-gradient(135deg, hsl(${hue},25%,16%), ${T.surface})` }} />
        <div style={{ padding: "0 14px", marginTop: -24 }}><CommunityAvatar c={community} size={48} ring /></div>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 0" }}>
        <button onClick={() => onOpen(community.id)} style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "start" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: T.text, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{community.name}</span>
            {community.kind === "brand" && <BadgeCheck size={14} color={T.accentWarm} />}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: T.textDim, fontSize: 12, marginTop: 4 }}>
            <FacePile members={community.members} size={18} />
            {community.members.length} {community.members.length === 1 ? tr("member") : tr("members")}
          </span>
        </button>
        <JoinButton state={state} onClick={() => onToggle(community.id)} />
      </div>
      {community.description
        ? <div style={{ padding: "8px 14px 14px", color: T.textDim, fontSize: 12.5, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{community.description}</div>
        : <div style={{ height: 14 }} />}
    </div>
  );
}

export function CommunityPostRow({ post, car, onOpenPost, onOpenCar, onOpenProfile }) {
  const hue = hueForId(post.id);
  return (
    <button onClick={() => onOpenPost(post.id)} style={{
      display: "flex", gap: 10, width: "100%", background: T.surface, border: `1px solid ${T.lineDark}`,
      borderRadius: 16, padding: 10, marginBottom: 10, textAlign: "start", boxShadow: T.shadowCard,
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

export function CommunityPage({ community, me, users, cars, posts, discussions, onToggle, openPost, openProfile, openThread, onNewThread, onNewPost, tab = "posts", setTab, onEdit, onDelete,
  isAppAdmin, myId, meets, openMeet, onPin, onAnswer, onSetRole, onRemove, flash }) {
  const state = joinState(community, me);
  const joined = state === "joined" || state === "requested";
  const safety = useSafety();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sort, setSort] = useState("new");
  const isOwner = community.kind === "custom" && community.createdBy === me;
  const hidden = safety?.prefs.hidden || [], blocked = safety?.prefs.blocked || [];
  if (tab === "discuss") tab = "chat"; // old links
  const order = ["posts", "chat", "people"];
  const groupAdmin = isGroupAdmin(community, me, isAppAdmin);
  const sw = useSwipe({
    onLeft: () => setTab(order[Math.min(order.length - 1, order.indexOf(tab) + 1)]),
    onRight: () => setTab(order[Math.max(0, order.indexOf(tab) - 1)]),
  });
  const cPosts = Object.values(posts).filter((p) => p.communityId === community.id && !p.archived && !hidden.includes(p.id) && !blocked.includes(p.authorUsername)).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div {...sw.bind} style={{ ...sw.bind.style, paddingBottom: 10, minHeight: "75vh" }}>
      {/* Banner edge to edge, the community's photo on it, then its name and who's in it. */}
      <div style={{ margin: "calc(-18px - var(--inset-top)) -16px 0", paddingTop: "var(--inset-top)", background: community.banner ? "#000" : "transparent", position: "relative" }}>
        <ProfileBanner url={community.banner} hue={hueForId(community.id || community.name)} testid="community-banner" />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: -34, position: "relative" }}>
        <CommunityAvatar c={community} size={76} ring />
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 4 }}>
          <JoinButton big state={state} onClick={() => onToggle(community.id)} />
          {safety && (
            <MoreMenu label={tr("Community options")} testid="community-menu" flash={safety.flash}
              share={{ title: community.name, text: tr("Join {0} on Lacerta", community.name) }}
              items={isOwner ? [
                { label: tr("Edit community"), icon: <Pencil size={17} />, onClick: () => setEditing(true) },
                { label: tr("Delete community"), icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
              ] : []}
              report={isOwner ? null : { what: "community", onSend: (reason, note) => safety.actions.report({ kind: "community", id: community.id, reason, note }) }} />
          )}
        </div>
      </div>
      <div style={{ marginTop: 10, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="display" data-testid="community-name" style={{ fontSize: 23, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{community.name}</div>
          {kindChip(community)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textDim, fontSize: 12.5, marginTop: 6 }}>
          <FacePile members={community.members} />
          <span><b style={{ color: T.text }}>{community.members.length}</b> {community.members.length === 1 ? tr("member") : tr("members")}</span>
          {cPosts.length > 0 && <span>· <b style={{ color: T.text }}>{cPosts.length}</b> {cPosts.length === 1 ? tr("post") : tr("posts")}</span>}
        </div>
      </div>
      {community.kind === "brand" && (
        <div data-testid="brand-note" style={{ color: T.textDim, fontSize: 12, lineHeight: 1.45, marginBottom: 8 }}>
          {tr("Made automatically for everyone who adds a {0} to their garage. It has no owner; Lacerta's moderators look after it.", community.name)}
        </div>
      )}
      {community.description && <RichText text={community.description} maxLines={MAX_LINES.description} style={{ color: T.textDim, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }} />}
      {isOwner && <EditCommunitySheet open={editing} onClose={() => setEditing(false)} community={community} onSave={onEdit} />}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title={tr("Delete {0}?", community.name)}
        body={tr("Its chat is removed. Posts stay on people's profiles and the feed, just without this community.")} onConfirm={() => onDelete(community.id)} />

      <Segmented testid="community-tabs" value={tab} onChange={setTab} options={[["posts", tr("Posts")], ["chat", tr("Chat")], ["people", (community.requests || []).length && groupAdmin ? tr("People ({0})", community.requests.length) : tr("People")]]} />

      <TabSlide index={order.indexOf(tab)} fadeOnly={tab === "chat"}>
      {tab === "posts" && (
        <>
          {state === "ask" || state === "requested"
            ? <div data-testid="post-locked" style={{ ...dashedBtn, color: T.textDim, fontWeight: 500 }}><Lock size={13} /> {state === "ask" ? tr("Ask to join to post here.") : tr("You can post once an admin lets you in.")}</div>
            : <button data-testid="post-to-community" onClick={onNewPost} className="press" style={dashedBtn}><Plus size={14} /> {state === "join" ? tr("Join and post to {0}", community.name) : tr("Post to {0}", community.name)}</button>}
          {cPosts.length === 0
            ? <EmptyState icon={<ImageIcon size={20} color={T.textDim} />} title={tr("No posts yet")} body={tr("Post a photo of your car here and it shows up for everyone in the community.")} />
            : <>
                {cPosts.length > 2 && (
                  <div data-testid="post-sort" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {[["new", tr("New"), <Sparkles key="i" size={12} />], ["top", tr("Top"), <Flame key="i" size={12} />]].map(([id, label, icon]) => (
                      <button key={id} data-testid={`sort-${id}`} onClick={() => setSort(id)} className="press" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 999, border: `1px solid ${sort === id ? T.accent : T.lineDark}`, background: sort === id ? "rgba(212,67,77,0.14)" : "transparent", color: sort === id ? T.text : T.textDim, fontSize: 12, fontWeight: 700 }}>{icon} {label}</button>
                    ))}
                  </div>
                )}
                <Mosaic key={sort} posts={sort === "top" ? [...cPosts].sort((x, y) => score(y) - score(x)) : cPosts} openPost={openPost} />
              </>}
        </>
      )}

      {tab === "chat" && <CrewChat community={community} me={me} users={users} meets={meets} isAppAdmin={isAppAdmin} myId={myId}
        openProfile={openProfile} openMeet={openMeet} onPin={onPin} flash={flash} />}

      {tab === "people" && <People community={community} me={me} isAppAdmin={isAppAdmin} users={users} posts={cPosts} openProfile={openProfile}
        onAnswer={onAnswer} onSetRole={onSetRole} onRemove={onRemove} />}
      </TabSlide>
    </div>
  );
}

const dashedBtn = {
  width: "100%", marginBottom: 14, padding: "11px 14px", borderRadius: 16, border: `1px dashed ${T.lineDark}`,
  background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};

const AUTO_LIMITS = [25, 50, 100, 250];
function EditCommunitySheet({ open, onClose, community, onSave }) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || "");
  const [joinMode, setJoinMode] = useState(community.joinMode || "open");
  const [chatMode, setChatMode] = useState(community.chatMode || "everyone");
  const [limit, setLimit] = useState(community.chatAutoLimit || 50);
  const [avatar, setAvatar] = useState(community.avatar || null);
  const [banner, setBanner] = useState(community.banner || null);
  const preview = { ...community, avatar, banner };
  return (
    <BottomSheet open={open} onClose={onClose} title={tr("Edit community")} maxHeight="88vh">
      <Field label={tr("Photo and banner")}>
        <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${T.lineDark}` }}>
          <ProfileBanner url={banner} hue={hueForId(community.id || community.name)} testid="community-banner-preview" />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: -26, padding: "0 12px", position: "relative" }}>
          <CommunityAvatar c={preview} size={56} ring />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <AvatarPicker onPick={setAvatar} />
          <BannerPicker onPick={setBanner} label={banner ? tr("Change banner") : tr("Add a banner")} />
          {(avatar || banner) && <button data-testid="community-looks-clear" onClick={() => { setAvatar(null); setBanner(null); }} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12.5, fontWeight: 600 }}>{tr("Remove both")}</button>}
        </div>
      </Field>
      <Field label={tr("Name")}><TextInput value={name} onChange={setName} maxLength={40} /></Field>
      <Field label={tr("Description")}><TextArea value={description} onChange={setDescription} maxLength={150} rows={3} maxLines={MAX_LINES.description} /></Field>
      <Field label={tr("Who can join")}>
        <Choice testid="join-mode" value={joinMode} onChange={setJoinMode} options={[["open", tr("Anyone"), tr("People join straight away")], ["approval", tr("Approved only"), tr("People ask; you or an admin let them in")]]} />
      </Field>
      <Field label={tr("Who can send messages")}>
        <Choice testid="chat-mode" value={chatMode} onChange={setChatMode} options={[
          ["everyone", tr("Everyone"), tr("Every member can write in the chat")],
          ["admins", tr("Admins only"), tr("Like an announcement group: members read, admins write")],
          ["auto", tr("Everyone, until it gets big"), tr("Switches to admins only after {0} members", limit)],
        ]} />
        {chatMode === "auto" && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {AUTO_LIMITS.map((n) => (
              <button key={n} data-testid={`auto-limit-${n}`} onClick={() => setLimit(n)} className="press" style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: `1px solid ${limit === n ? T.accent : T.lineDark}`, background: limit === n ? "rgba(212,67,77,0.14)" : T.surface, color: T.text, fontWeight: 700, fontSize: 13 }}>{n}</button>
            ))}
          </div>
        )}
      </Field>
      <button disabled={!name.trim()} onClick={async () => { if (await onSave(community.id, { name, description, joinMode, chatMode, chatAutoLimit: limit, avatar, banner })) onClose(); }} className="press" style={{ width: "100%", padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15 }}>{tr("Save")}</button>
    </BottomSheet>
  );
}

function Choice({ value, onChange, options, testid }) {
  return (
    <div data-testid={testid} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map(([v, label, hint]) => (
        <button key={v} data-testid={`${testid}-${v}`} onClick={() => onChange(v)} className="press" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, textAlign: "start", border: `1px solid ${value === v ? T.accent : T.lineDark}`, background: value === v ? "rgba(212,67,77,0.10)" : T.surface }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${value === v ? T.accent : T.textDim}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {value === v && <span style={{ width: 7, height: 7, borderRadius: 999, background: T.accent }} />}
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", color: T.text, fontSize: 14, fontWeight: 600 }}>{label}</span>
            <span style={{ display: "block", color: T.textDim, fontSize: 11.5, marginTop: 1 }}>{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// The Posts grid. Built row by row from a fixed pattern, so tiles always line up:
//   [ big | 2 small ]   [ 3 small ]   [ 2 small | big ]   [ 3 small ] ...
// In each "big" row the most liked/commented post of that row gets the big tile.
// Leftovers fill the last row edge to edge (one wide tile, or two halves).
const GAP = 6;
export function Mosaic({ posts, openPost }) {
  const rows = [];
  let i = 0, k = 0;
  while (i < posts.length) {
    const left = posts.length - i;
    if (left < 3) { rows.push({ kind: left === 1 ? "one" : "two", items: posts.slice(i) }); break; }
    const items = posts.slice(i, i + 3);
    const kind = ["bigL", "three", "bigR", "three"][k % 4];
    if (kind !== "three") {
      const top = items.reduce((best, p, j) => (score(p) > score(items[best]) ? j : best), 0);
      items.unshift(items.splice(top, 1)[0]);
    }
    rows.push({ kind, items });
    i += 3; k += 1;
  }
  let n = 0;
  const tile = (p, big, style) => <Tile key={p.id} p={p} big={big} openPost={openPost} delay={Math.min(n++, 12) * 35} style={style} />;
  return (
    <div data-testid="mosaic" style={{ display: "flex", flexDirection: "column", gap: GAP }}>
      {rows.map((r, ri) => {
        if (r.kind === "three") return <div key={ri} style={{ display: "flex", gap: GAP }}>{r.items.map((p) => tile(p, false, { flex: 1, aspectRatio: "1" }))}</div>;
        if (r.kind === "one") return <div key={ri} style={{ display: "flex" }}>{tile(r.items[0], true, { flex: 1, aspectRatio: "16 / 10" })}</div>;
        if (r.kind === "two") return <div key={ri} style={{ display: "flex", gap: GAP }}>{r.items.map((p) => tile(p, false, { flex: 1, aspectRatio: "1" }))}</div>;
        const [big, a2, b2] = r.items;
        const bigEl = tile(big, true, { flex: `0 0 calc((100% - ${GAP * 2}px) * 2 / 3 + ${GAP}px)`, aspectRatio: "1" });
        const side = (
          <div key="side" style={{ flex: 1, display: "flex", flexDirection: "column", gap: GAP }}>
            {tile(a2, false, { flex: 1, minHeight: 0 })}
            {tile(b2, false, { flex: 1, minHeight: 0 })}
          </div>
        );
        return <div key={ri} data-row={r.kind} style={{ display: "flex", gap: GAP }}>{r.kind === "bigL" ? [bigEl, side] : [side, bigEl]}</div>;
      })}
    </div>
  );
}

function Tile({ p, big, openPost, delay, style }) {
  const hue = hueForId(p.id);
  const first = (p.photos || [])[0];
  const video = first?.type === "video";
  return (
    <button data-testid={big ? "tile-big" : "tile"} onClick={() => openPost(p.id)} className="press" style={{
      ...style, position: "relative", borderRadius: big ? 18 : 14, overflow: "hidden", border: "none", padding: 0, minWidth: 0,
      background: p.photoUrl ? `url(${p.photoUrl}) center/cover, ${T.surface2}` : `linear-gradient(135deg, hsl(${hue},45%,24%), hsl(${hue},35%,12%))`,
      animation: `tileIn .45s ${delay}ms backwards cubic-bezier(.2,.8,.2,1)`,
    }}>
      {!p.photoUrl && <span style={{ position: "absolute", inset: 10, color: "#fff", fontSize: big ? 16 : 12, fontWeight: 600, textAlign: "start", overflow: "hidden", lineHeight: 1.35 }}>{p.caption || ""}</span>}
      {(video || (p.photos || []).length > 1) && (
        <span style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 4, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}>
          {video && <Play size={13} color="#fff" fill="#fff" />}
          {(p.photos || []).length > 1 && <Layers size={13} color="#fff" />}
        </span>
      )}
      {(big || score(p) > 0) && p.photoUrl && (
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: big ? "22px 10px 9px" : "16px 7px 6px", background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6))", display: "flex", gap: 9, color: "#fff", fontSize: big ? 12.5 : 11, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart size={big ? 13 : 11} fill="#fff" /> {p.likes.length}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MessageCircle size={big ? 13 : 11} /> {p.comments.length}</span>
          {big && p.authorUsername && <span style={{ marginInlineStart: "auto", opacity: 0.85, fontWeight: 600 }}>{AT}{p.authorUsername}</span>}
        </span>
      )}
    </button>
  );
}

function ThreadCard({ thread, me, onOpen }) {
  return (
    <button data-testid="thread-card" onClick={() => onOpen(thread.id)} className="press" style={{
      width: "100%", textAlign: "start", padding: 14, marginBottom: 10, borderRadius: 20,
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

// Join requests (for admins), the owner and admins, top posters, and everyone else.
function People({ community: c, me, isAppAdmin, users, posts, openProfile, onAnswer, onSetRole, onRemove }) {
  const [menu, setMenu] = useState(null);
  const myRole = roleIn(c, me, isAppAdmin);
  const admin = myRole === "owner" || myRole === "admin";
  const roleOf = (u) => roleIn(c, u, !!users[u]?.isAdmin);
  const counts = {};
  posts.forEach((p) => { counts[p.authorUsername] = (counts[p.authorUsername] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const leaders = c.members.filter((u) => ["owner", "admin"].includes(roleOf(u))).sort((a, b) => (roleOf(a) === "owner" ? -1 : roleOf(b) === "owner" ? 1 : 0));
  if (c.createdBy && !leaders.includes(c.createdBy)) leaders.unshift(c.createdBy);
  const others = c.members.filter((u) => !leaders.includes(u));
  // What the person looking can do to this member.
  const canManage = (u) => u !== me && admin && roleOf(u) !== "owner" && (roleOf(u) !== "admin" || myRole === "owner");
  const tag = (u) => {
    const r = roleOf(u);
    if (r === "owner") return <span style={pill(T.accentWarm)}><Crown size={11} /> {tr("Owner")}</span>;
    if (r === "admin") return <span style={pill(T.accent2)}><Shield size={11} /> {tr("Admin")}</span>;
    return null;
  };
  const row = (u, right) => (
    <div key={u} data-testid="member-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <button onClick={() => openProfile(u)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, textAlign: "start", minWidth: 0 }}>
        <Avatar username={u} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{users[u]?.name || u}</div>
          <div className="plate handle" style={{ color: T.textDim, fontSize: 10.5 }}>{AT}{u}</div>
        </div>
      </button>
      {right}
    </div>
  );
  const manageBtn = (u) => canManage(u) && (
    <button aria-label={tr("Manage {0}", u)} data-testid="member-manage" onClick={() => setMenu(u)} style={{ background: "none", border: "none", padding: 6 }}><MoreHorizontal size={18} color={T.textDim} /></button>
  );
  const requests = c.requests || [];
  return (
    <div data-testid="people">
      {admin && requests.length > 0 && (
        <>
          <SectionLabel>{tr("Asking to join ·")} {requests.length}</SectionLabel>
          {requests.map((u) => row(u, (
            <div style={{ display: "flex", gap: 6 }}>
              <button data-testid="request-accept" onClick={() => onAnswer(c.id, u, true)} className="press" style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 999, border: "none", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 700 }}><Check size={13} /> {tr("Accept")}</button>
              <button data-testid="request-decline" aria-label={tr("Decline")} onClick={() => onAnswer(c.id, u, false)} className="press" style={{ display: "flex", padding: 7, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: "none" }}><X size={14} color={T.textDim} /></button>
            </div>
          )))}
          <div style={{ height: 14 }} />
        </>
      )}
      <SectionLabel>{c.kind === "custom" ? tr("Owner and admins") : tr("Looked after by")}</SectionLabel>
      {leaders.length ? leaders.map((u) => row(u, <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{tag(u)}{manageBtn(u)}</div>)) : <div style={{ color: T.textDim, fontSize: 13 }}>{tr("Lacerta's moderators. Official brand communities have no owner.")}</div>}
      <div style={{ height: 14 }} />
      {top.length > 0 && (
        <>
          <SectionLabel>{tr("Top posters")}</SectionLabel>
          {top.map(([u, n], i) => row(u, <span style={{ color: T.textDim, fontSize: 11.5 }}>{i === 0 && <Crown size={12} color={T.accentWarm} style={{ marginInlineEnd: 4, verticalAlign: "-2px" }} />}{n === 1 ? tr("1 post") : tr("{0} posts", n)}</span>))}
          <div style={{ height: 14 }} />
        </>
      )}
      <SectionLabel>{tr("Members ·")} {c.members.length}</SectionLabel>
      {others.length === 0 ? <div style={{ color: T.textDim, fontSize: 13 }}>{tr("No other members yet.")}</div> : others.slice(0, 200).map((u) => row(u, manageBtn(u)))}

      <BottomSheet open={!!menu} onClose={() => setMenu(null)} title={menu ? `${AT}${menu}` : ""}>
        {menu && (
          <div data-testid="member-menu">
            {myRole === "owner" && (roleOf(menu) === "admin"
              ? <MenuRow icon={<Shield size={17} />} label={tr("Remove as admin")} onClick={() => { onSetRole(c.id, menu, "member"); setMenu(null); }} />
              : <MenuRow icon={<Shield size={17} />} label={tr("Make admin")} onClick={() => { onSetRole(c.id, menu, "admin"); setMenu(null); }} />)}
            <MenuRow danger icon={<UserMinus size={17} />} label={tr("Remove from group")} onClick={() => { onRemove(c.id, menu); setMenu(null); }} />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
const pill = (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, color, fontSize: 11.5, fontWeight: 700 });
function MenuRow({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 2px", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, color: danger ? T.accent : T.text, fontSize: 15, fontWeight: 600, textAlign: "start" }}>{icon} {label}</button>
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
      {community && <div className="plate" style={{ color: T.accent, fontSize: 10.5, marginBottom: 8 }}>{community.name} {tr("· Discuss")}</div>}
      <div className="display" style={{ fontSize: 22, color: T.text, lineHeight: 1.2 }}>{thread.title}</div>
      <button onClick={() => openProfile(thread.author)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, marginTop: 10 }}>
        <Avatar username={thread.author} size={26} />
        <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{thread.author}</span>
        <span style={{ color: T.textDim, fontSize: 12 }}>· {timeAgo(thread.date)}</span>
      </button>
      {thread.body && <RichText text={thread.body} maxLines={MAX_LINES.body} style={{ color: T.text, fontSize: 14.5, lineHeight: 1.55, marginTop: 14 }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", margin: "14px 0", borderTop: `1px solid ${T.lineDark}`, borderBottom: `1px solid ${T.lineDark}` }}>
        <button onClick={() => onLike(thread.id)} aria-label={tr("Like discussion")} style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 6, color: T.textDim, fontSize: 13 }}>
          <Heart size={18} color={liked ? T.accent : T.textDim} fill={liked ? T.accent : "none"} /> {thread.likes.length}
        </button>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: T.textDim, fontSize: 13 }}><MessageCircle size={18} /> {thread.replies.length}</span>
        <span style={{ flex: 1 }} />
        {safety && (
          <MoreMenu label={tr("Discussion options")} testid="thread-menu" flash={safety.flash}
            share={{ title: thread.title, text: tr("\"{0}\" in {1} on Lacerta", thread.title, community?.name || "a community") }}
            items={thread.author === me ? [
              { label: tr("Edit discussion"), icon: <Pencil size={17} />, onClick: () => { setTitle(thread.title); setBody(thread.body || ""); setEditing(true); } },
              { label: tr("Delete discussion"), icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
            ] : []}
            report={thread.author === me ? null : { what: "discussion", onSend: (reason, note) => safety.actions.report({ kind: "thread", id: thread.id, reason, note }) }}
            block={thread.author === me ? null : { handle: thread.author, blocked: blocked.includes(thread.author), onToggle: () => safety.actions.toggleBlock(thread.author) }} />
        )}
      </div>
      {thread.replies.length === 0 && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 14 }}>{tr("No replies yet. Start it off.")}</div>}
      {thread.replies.filter((r) => !blocked.includes(r.author)).map((r) => (
        <div key={r.id} data-testid="thread-reply" style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={() => openProfile(r.author)} style={{ background: "none", border: "none", padding: 0 }}><Avatar username={r.author} size={30} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ color: T.text, fontWeight: 700 }}>{r.author}</span> <span style={{ color: T.textDim }}>· {timeAgo(r.date)}</span>
              <span style={{ flex: 1 }} />
              {r.author === me
                ? <button onClick={() => onDeleteReply(thread.id, r.id)} style={{ background: "none", border: "none", padding: 0, color: T.textDim, fontSize: 11, fontWeight: 600 }}>{tr("Delete")}</button>
                : <button onClick={() => setReportReply(r.id)} style={{ background: "none", border: "none", padding: 0, color: T.textDim, fontSize: 11, fontWeight: 600 }}>{tr("Report")}</button>}
            </div>
            <RichText text={r.text} maxLines={8} style={{ color: T.text, fontSize: 14, lineHeight: 1.45, marginTop: 2 }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}><TextInput value={text} onChange={setText} placeholder={tr("Add to the discussion…")} maxLength={500} /></div>
        <button disabled={!text.trim()} onClick={async () => { const t = text; setText(""); const r = await onReply(thread.id, t); if (r === false) setText(t); }} className="press"
          style={{ padding: "0 16px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 600 }}>
          {tr("Reply")}
        </button>
      </div>
      {safety && <ReportSheet open={!!reportReply} onClose={() => setReportReply(null)} what={tr("reply")} onSend={(reason, note) => safety.actions.report({ kind: "threadReply", id: reportReply, reason, note })} />}
      <BottomSheet open={editing} onClose={() => setEditing(false)} title={tr("Edit discussion")} maxHeight="85vh">
        <Field label={tr("Title")}><TextInput value={title} onChange={setTitle} maxLength={100} /></Field>
        <Field label={tr("Details")}><TextArea value={body} onChange={setBody} maxLength={1000} rows={5} maxLines={MAX_LINES.body} /></Field>
        <button disabled={!title.trim()} onClick={async () => { await onEdit(thread.id, { title, body }); setEditing(false); }} className="press" style={{ width: "100%", padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15 }}>{tr("Save")}</button>
      </BottomSheet>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title={tr("Delete this discussion?")} body={tr("The discussion and all its replies will be removed.")} onConfirm={async () => { await onDelete(thread.id); onGone(); }} />
    </div>
  );
}

export function NewThreadForm({ community, onSubmit }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>{tr("Start a discussion")}</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>{tr("In {0}. New mods, opinions, questions, plans.", community.name)}</div>
      <Field label={tr("Title")}><TextInput value={title} onChange={setTitle} placeholder={tr("e.g. Best coilovers for daily + track?")} maxLength={100} /></Field>
      <Field label={tr("Details (optional)")}><TextArea value={body} onChange={setBody} placeholder={tr("Add context, your setup, what you've tried…")} maxLength={1000} rows={6} maxLines={MAX_LINES.body} /></Field>
      <button disabled={!title.trim() || busy} className="press" onClick={async () => { setBusy(true); await onSubmit({ title, body }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: title.trim() ? T.accent : T.surface2, color: title.trim() ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15 }}>
        {busy ? tr("Posting…") : tr("Post discussion")}
      </button>
    </div>
  );
}

export function CreateCommunityForm({ onSubmit }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false);
  const valid = name.trim();
  return (
    <div style={{ paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>{tr("Start a community")}</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>{tr("A model, a scene, a local meet crowd — whatever people can gather around.")}</div>
      <Field label={tr("Name")}><TextInput value={name} onChange={setName} placeholder={tr("e.g. R34 GT-R, JDM, Cars & Coffee QA")} maxLength={40} /></Field>
      <Field label={tr("Description (optional)")}><TextInput value={description} onChange={setDescription} placeholder={tr("What's it about?")} maxLength={150} /></Field>
      <button disabled={!valid || busy}
        onClick={async () => { setBusy(true); await onSubmit({ name, description }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? tr("Creating…") : tr("Create")}
      </button>
    </div>
  );
}
