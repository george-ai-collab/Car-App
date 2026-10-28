import { useState } from "react";
import { useSwipe } from "../lib/useSwipe";
import { MoreMenu, useSafety } from "../components/Safety";
import { Car, Compass, MapPin, Image as ImageIcon, Check, ExternalLink, Award, Settings, Plus, Layers, QrCode } from "lucide-react";
import { T } from "../theme";
import { computeBadges, nextBadgeProgress } from "../lib/badges";
import { Avatar, FollowAvatar, IconTab, IconBadge, EmptyState, BottomSheet, MiniStat, AccountLabel, isDriver } from "../components/ui";
import { CarCard, SightingCard } from "./Cars";

export function Profile({ username, me, cars, posts, users, sightings, tab = "posts", setTab, onToggleFollow, openCar, openPost, onAddCar, onOpenSettings }) {
  const [showBadges, setShowBadges] = useState(false);
  const safety = useSafety();
  const blocked = !!safety?.prefs.blocked.includes(username);
  const tabs = ["posts", "cars", "spotted"];
  const sw = useSwipe({
    onLeft: () => setTab(tabs[Math.min(2, tabs.indexOf(tab) + 1)]),
    onRight: () => setTab(tabs[Math.max(0, tabs.indexOf(tab) - 1)]),
  });
  const user = users[username] || { name: username, joinedAt: null, followers: [], following: [] };
  const isMe = username === me;
  const driver = isDriver(user);
  const view = driver ? tab : "posts";
  const iFollow = (users[me]?.following || []).includes(username);

  const myPosts = Object.values(posts).filter((p) => p.authorUsername === username && !p.archived).sort((a, b) => new Date(b.date) - new Date(a.date));
  const myCars = Object.values(cars).filter((c) => c.ownerUsername === username);
  const spottedCars = Object.values(cars).filter((c) => c.spotterUsernames.includes(username));
  const unmatchedSightings = Object.values(sightings || {}).filter((s) => s.spotterUsername === username && !s.matchedCarId);
  const badges = computeBadges(username, cars, sightings);
  const nextBadge = nextBadgeProgress(username, cars, sightings);

  return (
    <div {...sw.bind} style={{ ...sw.bind.style, paddingTop: 40, paddingBottom: 10, minHeight: "75vh" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
        <FollowAvatar username={username} size={76} showFollow={!isMe && !blocked} following={iFollow} onFollow={onToggleFollow} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div className="display" style={{ fontSize: 20, color: T.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || username}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span className="plate" style={{ fontSize: 11.5, color: T.textDim }}>@{username}</span>
            <AccountLabel username={username} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 8 }}>
            <MiniStat value={myPosts.length} label="Posts" />
            {driver && <MiniStat value={myCars.length} label="Cars" />}
            <MiniStat value={user.followers.length} label="Followers" />
            <MiniStat value={user.following.length} label="Following" />
          </div>
          {user.bio && <div style={{ color: T.text, fontSize: 13, lineHeight: 1.45, marginTop: 10, whiteSpace: "pre-wrap" }}>{user.bio}</div>}
        </div>
        {isMe && safety?.openTag && (
          <button onClick={() => safety.openTag({ kind: "user", id: username, title: user.name || username, subtitle: `@${username}` })} aria-label="Share tag" data-testid="profile-tag" className="press" style={{
            width: 38, height: 38, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <QrCode size={17} color={T.text} />
          </button>
        )}
        {isMe && onOpenSettings && (
          <button onClick={onOpenSettings} aria-label="Settings" className="press" style={{
            width: 38, height: 38, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Settings size={17} color={T.text} />
          </button>
        )}
        {!isMe && safety && (
          <MoreMenu label="Profile options" testid="profile-menu" flash={safety.flash}
            items={safety.openTag && !blocked ? [{ label: "Show tag", icon: <QrCode size={17} />, onClick: () => safety.openTag({ kind: "user", id: username, title: user.name || username, subtitle: `@${username}` }) }] : []}
            share={{ title: "Carfooly", text: `Check out @${username} on Carfooly` }}
            report={{ what: "account", onSend: (reason, note) => safety.actions.report({ kind: "user", id: username, reason, note }) }}
            block={{ handle: username, blocked, onToggle: () => safety.actions.toggleBlock(username) }} />
        )}
      </div>

      {blocked && (
        <div style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 18, padding: 16, textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 14.5 }}>You blocked @{username}</div>
          <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 4 }}>You won't see their posts, comments or discussions.</div>
          <button onClick={() => safety.actions.toggleBlock(username)} className="press" style={{ marginTop: 12, padding: "8px 16px", borderRadius: 999, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.text, fontWeight: 600, fontSize: 13 }}>Unblock</button>
        </div>
      )}
      {!blocked && <>

      {/* Clubs and businesses just have posts: no garage, spots or badges. */}
      {driver && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <IconTab active={tab === "posts"} onClick={() => { setTab("posts"); setShowBadges(false); }} icon={<ImageIcon size={17} />} />
          <IconTab active={tab === "cars"} onClick={() => { setTab("cars"); setShowBadges(false); }} icon={<Car size={17} />} />
          <IconTab active={tab === "spotted"} onClick={() => setTab("spotted")} icon={<MapPin size={17} />} />
        </div>
      </div>}
      {view === "spotted" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={() => setShowBadges(true)} className="press" style={{
            width: 34, height: 34, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Award size={15} color={T.accent} />
          </button>
        </div>
      )}

      {view === "posts" && (
        myPosts.length === 0 ? <EmptyState icon={<Compass size={20} color={T.textDim} />} title="No posts yet" body="" /> :
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {myPosts.map((p) => (
            <button key={p.id} onClick={() => openPost(p.id)} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "none", padding: 0, background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!p.photoUrl && (p.caption ? <span style={{ color: T.text, fontSize: 11.5, fontWeight: 600, padding: 8, lineHeight: 1.3, overflow: "hidden", maxHeight: "100%" }}>{p.caption}</span> : <Car size={18} color={T.textDim} />)}
              {(p.photos || []).length > 1 && <Layers size={14} color="#fff" style={{ position: "absolute", top: 6, right: 6, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }} />}
            </button>
          ))}
        </div>
      )}
      {view === "cars" && (
        <div>
          {isMe && onAddCar && (
            <button onClick={onAddCar} className="press" style={{ width: "100%", marginBottom: 14, padding: "10px 14px", borderRadius: 16, border: `1px dashed ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={14} /> Add a car
            </button>
          )}
          {myCars.length === 0 ? <EmptyState icon={<Car size={20} color={T.textDim} />} title="No cars added" body="" /> :
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{myCars.map((c) => <CarCard key={c.id} car={c} onOpen={openCar} showPrivate={isMe} />)}</div>}
        </div>
      )}
      {view === "spotted" && (
        spottedCars.length === 0 && unmatchedSightings.length === 0 ? <EmptyState icon={<MapPin size={20} color={T.textDim} />} title="No spots logged" body="" /> :
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {spottedCars.map((c) => <CarCard key={c.id} car={c} onOpen={openCar} />)}
          {unmatchedSightings.map((s) => <SightingCard key={s.id} sighting={s} />)}
        </div>
      )}

      </>}
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
