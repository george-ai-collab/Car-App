import { useState } from "react";
import { Car, Compass, MapPin, Image as ImageIcon, Check, ExternalLink, Award, Settings } from "lucide-react";
import { T } from "../theme";
import { computeBadges, nextBadgeProgress } from "../lib/badges";
import { Avatar, IconTab, IconBadge, EmptyState, BottomSheet, MiniStat } from "../components/ui";
import { CarCard, SightingCard } from "./Cars";

export function Profile({ username, me, cars, posts, users, sightings, tab = "posts", setTab, onToggleFollow, openCar, openPost, onBrowseCars, onOpenSettings }) {
  const [showBadges, setShowBadges] = useState(false);
  const user = users[username] || { name: username, joinedAt: null, followers: [], following: [] };
  const isMe = username === me;
  const iFollow = (users[me]?.following || []).includes(username);

  const myPosts = Object.values(posts).filter((p) => p.authorUsername === username && !p.archived).sort((a, b) => new Date(b.date) - new Date(a.date));
  const myCars = Object.values(cars).filter((c) => c.ownerUsername === username);
  const spottedCars = Object.values(cars).filter((c) => c.spotterUsernames.includes(username));
  const unmatchedSightings = Object.values(sightings || {}).filter((s) => s.spotterUsername === username && !s.matchedCarId);
  const badges = computeBadges(username, cars, sightings);
  const nextBadge = nextBadgeProgress(username, cars, sightings);

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
        <Avatar username={username} size={72} />
        <div style={{ flex: 1, paddingTop: 2 }}>
          <div className="display" style={{ fontSize: 19, color: T.text, lineHeight: 1.2 }}>{user.name || username}</div>
          <div className="plate" style={{ fontSize: 11.5, color: T.textDim, marginTop: 2 }}>@{username}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <MiniStat value={myPosts.length} label="Posts" />
            <MiniStat value={myCars.length} label="Cars" />
            <MiniStat value={user.followers.length} label="Followers" />
            <MiniStat value={user.following.length} label="Following" />
          </div>
          {user.bio && <div style={{ color: T.text, fontSize: 13, lineHeight: 1.45, marginTop: 10, whiteSpace: "pre-wrap" }}>{user.bio}</div>}
        </div>
        {isMe && onOpenSettings && (
          <button onClick={onOpenSettings} aria-label="Settings" className="press" style={{
            width: 38, height: 38, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Settings size={17} color={T.text} />
          </button>
        )}
        {!isMe && (
          <button onClick={onToggleFollow} className="press" style={{
            padding: "8px 16px", borderRadius: 999, border: `1px solid ${iFollow ? T.lineDark : T.accent}`,
            background: iFollow ? "transparent" : T.accent, color: iFollow ? T.text : "#fff",
            fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
            boxShadow: iFollow ? "none" : T.shadowAccent,
          }}>
            {iFollow && <Check size={12} />} {iFollow ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <IconTab active={tab === "posts"} onClick={() => { setTab("posts"); setShowBadges(false); }} icon={<ImageIcon size={17} />} />
          <IconTab active={tab === "cars"} onClick={() => { setTab("cars"); setShowBadges(false); }} icon={<Car size={17} />} />
          <IconTab active={tab === "spotted"} onClick={() => setTab("spotted")} icon={<MapPin size={17} />} />
        </div>
      </div>
      {tab === "spotted" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={() => setShowBadges(true)} className="press" style={{
            width: 34, height: 34, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Award size={15} color={T.accent} />
          </button>
        </div>
      )}

      {tab === "posts" && (
        myPosts.length === 0 ? <EmptyState icon={<Compass size={20} color={T.textDim} />} title="No posts yet" body="" /> :
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {myPosts.map((p) => (
            <button key={p.id} onClick={() => openPost(p.id)} style={{ aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "none", padding: 0, background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!p.photoUrl && <Car size={18} color={T.textDim} />}
            </button>
          ))}
        </div>
      )}
      {tab === "cars" && (
        <div>
          {isMe && (
            <button onClick={onBrowseCars} style={{ width: "100%", marginBottom: 14, padding: "10px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Browse every car on Carfooly <ExternalLink size={14} color={T.textDim} />
            </button>
          )}
          {myCars.length === 0 ? <EmptyState icon={<Car size={20} color={T.textDim} />} title="No cars added" body="" /> :
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{myCars.map((c) => <CarCard key={c.id} car={c} onOpen={openCar} />)}</div>}
        </div>
      )}
      {tab === "spotted" && (
        spottedCars.length === 0 && unmatchedSightings.length === 0 ? <EmptyState icon={<MapPin size={20} color={T.textDim} />} title="No spots logged" body="" /> :
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {spottedCars.map((c) => <CarCard key={c.id} car={c} onOpen={openCar} />)}
          {unmatchedSightings.map((s) => <SightingCard key={s.id} sighting={s} />)}
        </div>
      )}

      <BottomSheet open={showBadges} onClose={() => setShowBadges(false)} title="Badges">
        {badges.length === 0 ? (
          <EmptyState icon={<Award size={20} color={T.textDim} />} title="No badges yet" body="Spot cars to start earning them." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {badges.map((b) => (
              <div key={b.kind + b.count} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <IconBadge tone={b.tone} size={56}><Award size={24} color={b.tone === "warm" ? T.accentWarm : b.tone === "accent2" ? T.accent2 : T.accent} /></IconBadge>
                <span style={{ fontSize: 11, color: T.text, fontWeight: 600, textAlign: "center" }}>{b.name}</span>
              </div>
            ))}
          </div>
        )}
        {isMe && nextBadge && (
          <div style={{ fontSize: 12.5, color: T.textDim, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.lineDark}` }}>
            {nextBadge.needed} more {nextBadge.needed === 1 ? "spot" : "spots"} to unlock <span style={{ color: T.text, fontWeight: 600 }}>{nextBadge.name}</span>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
