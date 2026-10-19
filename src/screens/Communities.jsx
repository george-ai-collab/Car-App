import { useState } from "react";
import { Car, Image as ImageIcon, Heart, MessageCircle, Check } from "lucide-react";
import { T } from "../theme";
import { hueForId } from "../lib/utils";
import { Avatar, EmptyState, Field, TextInput, SectionLabel } from "../components/ui";

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
          background: joined ? "transparent" : T.accent, color: joined ? T.text : T.ink, fontSize: 12.5, fontWeight: 600,
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
        background: joined ? "transparent" : T.accent, color: joined ? T.text : T.ink, fontSize: 12.5, fontWeight: 600,
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

export function CommunityPage({ community, me, cars, posts, onToggle, openPost, openCar }) {
  const joined = community.members.includes(me);
  const communityPosts = Object.values(posts).filter((p) => p.communityId === community.id && !p.archived).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <Avatar username={community.name} size={56} />
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 19, color: T.text }}>{community.name}</div>
          <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 2 }}>{community.members.length} {community.members.length === 1 ? "member" : "members"}</div>
        </div>
        <button onClick={() => onToggle(community.id)} className="press" style={{
          padding: "8px 16px", borderRadius: 999, border: `1px solid ${joined ? T.lineDark : T.accent}`,
          background: joined ? "transparent" : T.accent, color: joined ? T.text : "#fff",
          fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
          boxShadow: joined ? "none" : T.shadowAccent,
        }}>
          {joined && <Check size={12} />} {joined ? "Joined" : "Join"}
        </button>
      </div>
      {community.description && <div style={{ color: T.textDim, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>{community.description}</div>}

      <SectionLabel>Posts</SectionLabel>
      {communityPosts.length === 0 ? (
        <EmptyState icon={<ImageIcon size={20} color={T.textDim} />} title="No posts yet"
          body={joined ? "Tag this community next time you post about a car." : "Join to be the first to post here."} />
      ) : (
        communityPosts.map((p) => (
          <CommunityPostRow key={p.id} post={p} car={cars[p.carId]} onOpenPost={openPost} onOpenCar={openCar} />
        ))
      )}
    </div>
  );
}

export function CreateCommunityForm({ onSubmit }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false);
  const valid = name.trim();
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Start a community</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>A model, a scene, a local meet crowd — whatever people can gather around.</div>
      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="e.g. R34 GT-R, JDM, Cars & Coffee QA" maxLength={40} /></Field>
      <Field label="Description (optional)"><TextInput value={description} onChange={setDescription} placeholder="What's it about?" maxLength={150} /></Field>
      <button disabled={!valid || busy}
        onClick={async () => { setBusy(true); await onSubmit({ name, description }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: valid ? T.accent : T.surface2, color: valid ? T.ink : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
