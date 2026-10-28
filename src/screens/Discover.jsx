import { useState } from "react";
import { Plus, Heart, Rss, Calendar, Users, ExternalLink, Search, ChevronRight, ScanLine } from "lucide-react";
import { T } from "../theme";
import { timeAgo } from "../lib/utils";
import { Avatar, IconBadge, EmptyState, TextInput, SectionLabel, Segmented } from "../components/ui";
import { useSwipe } from "../lib/useSwipe";
import { CarCard } from "./Cars";
import { CommunityCard } from "./Communities";
import { tr } from "../lib/i18n";

// Discover is a set of doors: tap one to open that section (like the + menu).
export function DiscoverView({ meets, communities, news, onOpenSearch, onOpenCommunities, onOpenMeets, onOpenNews, onScan }) {
  const upcoming = Object.values(meets).filter((m) => !m.when || new Date(m.when) >= new Date()).length;
  const tiles = [
    { id: "meets", title: tr("Meets"), sub: tr("Find meets near you, or anywhere in the world"), count: tr("{0} upcoming", upcoming), icon: <Calendar size={24} color="#BFE0EC" />, tone: "accent2", onClick: onOpenMeets },
    { id: "communities", title: tr("Communities"), sub: tr("Your make, your scene, your people"), count: tr("{0} communities", Object.keys(communities).length), icon: <Users size={24} color={T.accent} />, tone: "accent", onClick: onOpenCommunities },
    { id: "news", title: tr("News"), sub: tr("What's happening in cars and racing"), count: tr("{0} stories", Object.keys(news).length), icon: <Rss size={24} color={T.accentWarm} />, tone: "warm", onClick: onOpenNews },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div className="display" style={{ fontSize: 24, color: T.text }}>{tr("Discover")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {onScan && (
            <button onClick={onScan} aria-label={tr("Scan a tag")} data-testid="scan-tag" className="press" style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 999, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ScanLine size={19} color={T.text} />
            </button>
          )}
          <button onClick={onOpenSearch} aria-label={tr("Search")} className="press" style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 999, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Search size={19} color={T.text} />
          </button>
        </div>
      </div>
      {tiles.map((t) => (
        <button key={t.id} data-testid={`door-${t.id}`} onClick={t.onClick} className="press" style={{
          width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "22px 18px", marginBottom: 12, textAlign: "start",
          background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`, borderRadius: 24, boxShadow: T.shadowCard,
        }}>
          <IconBadge size={56} tone={t.tone}>{t.icon}</IconBadge>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>{t.title}</div>
            <div style={{ color: T.textDim, fontSize: 13, lineHeight: 1.4, marginTop: 3 }}>{t.sub}</div>
            <div className="plate" style={{ color: T.textDim, fontSize: 10.5, marginTop: 8 }}>{t.count}</div>
          </div>
          <ChevronRight size={20} color={T.textDim} />
        </button>
      ))}
    </div>
  );
}

export function DivisionCard({ title, icon, tone, onSeeAll, children }) {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`,
      borderRadius: 22, padding: 16, marginBottom: 14, boxShadow: T.shadowCard, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: tone === "teal" ? T.accent2 : T.accent, opacity: 0.7 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon && <IconBadge size={30} tone={tone}>{icon}</IconBadge>}
          <div style={{ color: T.text, fontSize: 15.5, fontWeight: 700 }}>{title}</div>
        </div>
        <button onClick={onSeeAll} className="press" style={{ background: "none", border: "none", color: T.accent, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 2, padding: 0 }}>
          {tr("See all")} <ChevronRight size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}

export function SearchScreen({ me, cars, users, communities, openCar, openProfile, openCommunity, onToggleCommunity }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const allUsernames = new Set(Object.keys(users));
  Object.values(cars).forEach((c) => {
    allUsernames.add(c.ownerUsername);
    (c.spotterUsernames || []).forEach((u) => allUsernames.add(u));
    (c.followerUsernames || []).forEach((u) => allUsernames.add(u));
  });

  const matchedUsers = query ? [...allUsernames].filter((u) => u && u.toLowerCase().includes(query)) : [];
  const matchedCars = query ? Object.values(cars).filter((c) => (c.hasPage !== false || c.ownerUsername === me) && `${c.make} ${c.model} ${c.year}`.toLowerCase().includes(query)) : [];
  const matchedCommunities = query ? Object.values(communities).filter((c) => c.name.toLowerCase().includes(query)) : [];
  const noResults = query && matchedUsers.length === 0 && matchedCars.length === 0 && matchedCommunities.length === 0;

  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 14 }}>{tr("Search")}</div>
      <TextInput value={q} onChange={setQ} placeholder={tr("Find a person, car, or community…")} icon={<Search size={14} />} autoFocus />
      {noResults && <div style={{ color: T.textDim, fontSize: 13, marginTop: 20 }}>{tr("No matches for \"{0}\"", q)}</div>}
      {matchedCommunities.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>{tr("Communities")}</SectionLabel>
          {matchedCommunities.map((c) => <CommunityCard key={c.id} community={c} me={me} onToggle={onToggleCommunity} onOpen={openCommunity} />)}
        </div>
      )}
      {matchedUsers.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>{tr("People")}</SectionLabel>
          {matchedUsers.map((u) => (
            <button key={u} onClick={() => openProfile(u)} style={{
              width: "100%", background: "none", border: "none", padding: "10px 0",
              display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${T.lineDark}`,
            }}>
              <Avatar username={u} size={30} />
              <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{u}</span>
            </button>
          ))}
        </div>
      )}
      {matchedCars.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>{tr("Cars")}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {matchedCars.map((c) => <CarCard key={c.id} car={c} onOpen={openCar} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function CommunitiesScreen({ me, communities, onToggle, onOpen, onCreate }) {
  const list = Object.values(communities).sort((a, b) => b.members.length - a.members.length);
  return (
    <div>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 14 }}>{tr("Communities")}</div>
      <button onClick={onCreate} style={{ width: "100%", marginBottom: 14, padding: "10px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Plus size={14} /> {tr("Start a community")}
      </button>
      {list.length === 0 ? (
        <EmptyState icon={<Users size={20} color={T.textDim} />} title={tr("No communities yet")} body={tr("Add a car or start one yourself.")} />
      ) : (
        list.map((c) => <CommunityCard key={c.id} community={c} me={me} onToggle={onToggle} onOpen={onOpen} />)
      )}
    </div>
  );
}

export function NewsScreen({ me, news, onLike }) {
  const [tab, setTab] = useState("general");
  const sw = useSwipe({ onLeft: () => setTab("racing"), onRight: () => setTab("general") });
  const list = Object.values(news).filter((n) => n.category === tab).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div {...sw.bind} style={{ ...sw.bind.style, minHeight: "70vh" }}>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 6 }}>{tr("News")}</div>
      <Segmented value={tab} onChange={setTab} options={[["general", tr("General")], ["racing", tr("Racing")]]} />
      {list.length === 0 ? (
        <EmptyState icon={<Rss size={20} color={T.textDim} />} title={tr("Nothing here yet")} body={tr("Check back soon.")} />
      ) : (
        list.map((n) => <NewsCard key={n.id} item={n} me={me} onLike={onLike} />)
      )}
    </div>
  );
}

export function NewsCard({ item, me, onLike, compact }) {
  const liked = item.likes.includes(me);
  const [pop, setPop] = useState(false);
  const doLike = () => { onLike(item.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div style={{ marginBottom: compact ? 10 : 14, paddingBottom: compact ? 10 : 14, borderBottom: compact ? "none" : `1px solid ${T.lineDark}` }}>
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", color: T.text, fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, marginBottom: 4, textDecoration: "none" }}>
        {item.title}
      </a>
      <div className="plate" style={{ fontSize: 10.5, color: T.accent, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
        {item.source} <ExternalLink size={11} />
      </div>
      {!compact && item.note && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>{item.note}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={doLike} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
          <Heart size={15} color={liked ? T.accent : T.textDim} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} />
          <span style={{ fontSize: 12, color: T.textDim }}>{item.likes.length}</span>
        </button>
        <span style={{ fontSize: 11.5, color: T.textDim }}>{timeAgo(item.date)}</span>
      </div>
    </div>
  );
}
