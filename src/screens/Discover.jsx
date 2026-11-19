import { useEffect, useState } from "react";
import { Plus, Heart, Rss, Calendar, Users, ExternalLink, Search, ChevronRight, ScanLine, Flag, Navigation, Globe, LocateFixed, Loader2, MapPin } from "lucide-react";
import { T } from "../theme";
import { timeAgo } from "../lib/utils";
import { Avatar, IconBadge, EmptyState, TextInput, SectionLabel, Segmented, TabSlide } from "../components/ui";
import { useSwipe } from "../lib/useSwipe";
import { CarCard } from "./Cars";
import { CommunityCard } from "./Communities";
import { tr, locale } from "../lib/i18n";
import { tracks as loadTracks, refreshNews } from "../lib/catalog";
import { distanceKm, loadArea, saveArea, directionsUrl, reversePlace } from "../lib/geo";
import { handleLocationError } from "../lib/permissions";

// Discover reads like the feed: a scrolling list of cards (upcoming meets, news stories,
// communities, tracks near you), with quick links to each section at the top.
export function DiscoverView({ me, users, meets, communities, news, onOpenSearch, onOpenCommunities, onOpenMeets, onOpenNews, onOpenTracks, onScan, openMeet, openProfile, openCommunity, onLikeNews, onToggleCommunity }) {
  const now = Date.now();
  const upcoming = Object.values(meets).filter((m) => m.when && new Date(m.when).getTime() > now - 4 * 3600e3).sort((a, b) => new Date(a.when) - new Date(b.when));
  const stories = Object.values(news).sort((a, b) => new Date(b.date) - new Date(a.date));
  const groups = Object.values(communities).sort((a, b) => b.members.length - a.members.length);
  const [near, setNear] = useState(null);
  useEffect(() => {
    let on = true;
    Promise.all([loadTracks(), loadArea()]).then(([list, area]) => {
      if (!on || !list?.length) return;
      const withKm = list.map((t) => ({ ...t, km: area?.lat != null ? distanceKm(area, t) : null })).sort((x, y) => (x.km ?? 1e9) - (y.km ?? 1e9)).slice(0, 3);
      setNear({ list: withKm, area });
    });
    return () => { on = false; };
  }, []);

  // Mix the cards like a feed: a meet, a couple of stories, a community, tracks…
  const cards = [];
  const mq = upcoming.slice(0, 6), nq = stories.slice(0, 14), cq = groups.slice(0, 4);
  let i = 0;
  while (mq.length || nq.length || cq.length) {
    if (mq.length) cards.push({ k: "meet", v: mq.shift() });
    if (nq.length) cards.push({ k: "news", v: nq.shift() });
    if (nq.length) cards.push({ k: "news", v: nq.shift() });
    if (i === 0 && near) cards.push({ k: "tracks" });
    if (cq.length) cards.push({ k: "community", v: cq.shift() });
    i++;
  }
  if (!cards.some((c) => c.k === "tracks") && near) cards.push({ k: "tracks" });

  const sections = [
    { id: "meets", title: tr("Meets"), icon: <Calendar size={16} />, n: upcoming.length, onClick: onOpenMeets },
    { id: "communities", title: tr("Communities"), icon: <Users size={16} />, n: Object.keys(communities).length, onClick: onOpenCommunities },
    { id: "tracks", title: tr("Tracks"), icon: <Flag size={16} />, onClick: onOpenTracks },
    { id: "news", title: tr("News"), icon: <Rss size={16} />, n: stories.length, onClick: onOpenNews },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="display" style={{ fontSize: 26, color: T.text }}>{tr("Discover")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {onScan && (
            <button onClick={onScan} aria-label={tr("Scan a tag")} data-testid="scan-tag" className="press" style={roundBtn}>
              <ScanLine size={19} color={T.text} />
            </button>
          )}
        </div>
      </div>
      <button onClick={onOpenSearch} aria-label={tr("Search")} className="press" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.textDim, fontSize: 14, marginBottom: 12, textAlign: "start" }}>
        <Search size={17} color={T.textDim} /> {tr("Search people, cars and communities")}
      </button>
      <div data-noswipe style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -16px 6px", padding: "0 16px 4px" }}>
        {sections.map((t) => (
          <button key={t.id} data-testid={`door-${t.id}`} onClick={t.onClick} className="press" style={{
            flex: "0 0 auto", display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 999,
            border: `1px solid ${T.lineDark}`, background: T.surface2, color: T.text, fontSize: 13.5, fontWeight: 700,
          }}>
            <span style={{ color: T.accent, display: "flex" }}>{t.icon}</span>{t.title}
            {t.n != null && <span style={{ color: T.textDim, fontWeight: 600, fontSize: 12 }}>{t.n}</span>}
          </button>
        ))}
      </div>

      <div style={{ margin: "0 -16px" }}>
        {cards.length === 0 && <div style={{ padding: "30px 16px" }}><EmptyState icon={<Rss size={20} color={T.textDim} />} title={tr("Nothing here yet")} body={tr("Check back soon.")} /></div>}
        {cards.map((c, k) => {
          if (c.k === "meet") return <MeetFeedCard key={"m" + c.v.id} meet={c.v} users={users} onOpen={openMeet} openProfile={openProfile} />;
          if (c.k === "news") return <NewsFeedCard key={"n" + c.v.id} item={c.v} me={me} onLike={onLikeNews} />;
          if (c.k === "community") return <CommunityFeedCard key={"c" + c.v.id} c={c.v} me={me} onOpen={openCommunity} onToggle={onToggleCommunity} />;
          return <TracksFeedCard key={"t" + k} near={near} onOpen={onOpenTracks} />;
        })}
      </div>
    </div>
  );
}
const roundBtn = { background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 999, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" };
const cardWrap = { borderTop: `1px solid ${T.lineDark}`, padding: "14px 0 6px", animation: "fadeIn .3s ease" };
const cardHead = { display: "flex", alignItems: "center", gap: 11, padding: "0 16px" };
const kicker = (color) => ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color, fontWeight: 700 });

function MeetFeedCard({ meet, users, onOpen, openProfile }) {
  const d = new Date(meet.when);
  const going = (meet.attendees || []).length;
  const host = meet.submittedBy;
  const live = d.getTime() <= Date.now();
  return (
    <article data-testid="discover-meet" style={cardWrap}>
      <div style={cardHead}>
        {host ? <button onClick={() => openProfile?.(host)} style={{ background: "none", border: "none", padding: 0 }}><Avatar username={host} size={42} /></button> : <IconBadge size={42} tone="accent"><Calendar size={18} color={T.text} /></IconBadge>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>{host ? (users?.[host]?.name || host) : tr("Meet")}</div>
          <div className="plate" style={kicker(live ? "#FFB3B8" : T.accent)}><Calendar size={11} /> {live ? tr("Live now") : tr("Upcoming meet")}</div>
        </div>
      </div>
      <button onClick={() => onOpen?.(meet.id)} className="press" style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, textAlign: "start", marginTop: 12 }}>
        <div style={{ position: "relative", height: 170, overflow: "hidden",
          background: meet.cover ? `url(${meet.cover}) center/cover` : `radial-gradient(120% 120% at 100% 0%, rgba(212,67,77,0.45), transparent 60%), linear-gradient(135deg, #22252B, ${T.bg})` }}>
          <div style={{ position: "absolute", left: 16, bottom: 14, right: 16, display: "flex", alignItems: "flex-end", gap: 14 }}>
            <div style={{ background: "rgba(12,13,16,0.75)", backdropFilter: "blur(6px)", borderRadius: 14, padding: "8px 12px", textAlign: "center", border: `1px solid ${T.glassBorder}` }}>
              <div className="plate" style={{ color: T.accent, fontSize: 10.5 }}>{d.toLocaleDateString(locale(), { month: "short" })}</div>
              <div className="display" style={{ color: "#fff", fontSize: 26, lineHeight: 1 }}>{d.getDate()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
              <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>{meet.title}</div>
              <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                {d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" })} · <MapPin size={11} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meet.city || meet.location}</span>
              </div>
            </div>
          </div>
        </div>
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px" }}>
        <span style={{ color: T.textDim, fontSize: 13 }}>{going === 1 ? tr("1 going") : tr("{0} going", going)}</span>
        <button onClick={() => onOpen?.(meet.id)} className="press" style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 13 }}>{tr("See meet")}</button>
      </div>
    </article>
  );
}

function NewsFeedCard({ item, me, onLike }) {
  const liked = item.likes.includes(me);
  const [pop, setPop] = useState(false);
  const doLike = () => { onLike(item.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <article data-testid="discover-news" dir={item.lang === "ar" ? "rtl" : undefined} style={cardWrap}>
      <div style={cardHead}>
        <IconBadge size={42} tone="warm"><Rss size={18} color={T.accentWarm} /></IconBadge>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>{item.source}</div>
          <div style={{ color: T.textDim, fontSize: 12 }}>{timeAgo(item.date)}</div>
        </div>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", color: T.text, fontSize: 16, fontWeight: 700, lineHeight: 1.35, padding: "10px 16px 0", textDecoration: "none" }}>{item.title}</a>
      {item.image && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 12 }}>
          <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
            style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block", background: T.surface2 }} />
        </a>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 6px 4px" }}>
        <button onClick={doLike} aria-label={tr("Like")} className="press" style={actBtn}>
          <Heart size={20} color={liked ? T.accent : T.textDim} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} /> <span>{item.likes.length}</span>
        </button>
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...actBtn, textDecoration: "none" }}><ExternalLink size={18} color={T.textDim} /> {tr("Read")}</a>
      </div>
    </article>
  );
}
const actBtn = { background: "none", border: "none", padding: "10px 14px", display: "flex", alignItems: "center", gap: 7, color: T.textDim, fontSize: 14, fontWeight: 600 };

function CommunityFeedCard({ c, me, onOpen, onToggle }) {
  const state = c.members.includes(me) ? "joined" : (c.requests || []).includes(me) ? "requested" : c.kind === "custom" && c.joinMode === "approval" ? "ask" : "join";
  const label = { joined: tr("Joined"), requested: tr("Requested"), ask: tr("Ask to join"), join: tr("Join") }[state];
  return (
    <article data-testid="discover-community" style={cardWrap}>
      <div style={cardHead}>
        <IconBadge size={42} tone="accent"><Users size={18} color={T.accent} /></IconBadge>
        <button onClick={() => onOpen?.(c.id)} style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "start" }}>
          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>{c.name}</div>
          <div style={{ color: T.textDim, fontSize: 12 }}>{c.members.length === 1 ? tr("1 member") : tr("{0} members", c.members.length)}</div>
        </button>
        <button onClick={() => onToggle?.(c.id)} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: state === "join" || state === "ask" ? "none" : `1px solid ${T.lineDark}`, background: state === "join" || state === "ask" ? T.accent : "none", color: state === "join" || state === "ask" ? "#fff" : T.textDim, fontSize: 12.5, fontWeight: 700 }}>{label}</button>
      </div>
      {c.description && <div style={{ color: T.textDim, fontSize: 13.5, lineHeight: 1.45, padding: "10px 16px 10px" }}>{c.description}</div>}
    </article>
  );
}

function TracksFeedCard({ near, onOpen }) {
  if (!near) return null;
  return (
    <article data-testid="discover-tracks" style={cardWrap}>
      <div style={cardHead}>
        <IconBadge size={42} tone="accent2"><Flag size={18} color={T.accent2} /></IconBadge>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>{tr("Tracks near you")}</div>
          <div style={{ color: T.textDim, fontSize: 12 }}>{near.area ? tr("From {0}", near.area.label || near.area.city || tr("your area")) : tr("Race tracks, drag strips and karting")}</div>
        </div>
      </div>
      <div style={{ padding: "8px 16px 6px" }}>
        {near.list.map((t) => (
          <button key={t.id} onClick={onOpen} className="press" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 0", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, textAlign: "start" }}>
            <Flag size={15} color={T.accent} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", color: T.text, fontSize: 14, fontWeight: 600 }}>{t.name}</span>
              <span style={{ display: "block", color: T.textDim, fontSize: 12 }}>{[t.city, t.country].filter(Boolean).join(", ")}</span>
            </span>
            {t.km != null && <span className="plate" style={{ color: T.accent2, fontSize: 11.5 }}>{tr("{0} km", t.km < 10 ? t.km.toFixed(1) : Math.round(t.km).toLocaleString(locale()))}</span>}
          </button>
        ))}
        <button onClick={onOpen} className="press" style={{ marginTop: 6, background: "none", border: "none", color: T.accent, fontWeight: 700, fontSize: 13, padding: "6px 0", display: "flex", alignItems: "center", gap: 3 }}>{tr("See all tracks")} <ChevronRight size={14} className="flip-rtl" /></button>
      </div>
    </article>
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

const NEWS_TABS = ["general", "racing", "gulf"];
export function NewsScreen({ me, news, onLike, onRefresh, focusId }) {
  // Opened from a story (What's on): start on that story's tab, scroll to it and light it up.
  const [tab, setTab] = useState(() => (focusId && NEWS_TABS.includes(news[focusId]?.category) ? news[focusId].category : "general"));
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-news-id="${CSS.escape(focusId)}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.animate([{ backgroundColor: "rgba(212,67,77,0.22)" }, { backgroundColor: "rgba(212,67,77,0)" }], { duration: 1800, easing: "ease-out" });
    }, 80);
    return () => clearTimeout(t);
  }, [focusId]);
  const i = NEWS_TABS.indexOf(tab);
  const sw = useSwipe({ onLeft: () => setTab(NEWS_TABS[Math.min(i + 1, 2)]), onRight: () => setTab(NEWS_TABS[Math.max(i - 1, 0)]) });
  // Opening News asks the server for fresh headlines (it only fetches if they're 3+ hours old).
  useEffect(() => { refreshNews().then(() => onRefresh && onRefresh()); }, []);
  const list = Object.values(news).filter((n) => n.category === tab).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div {...sw.bind} style={{ ...sw.bind.style, minHeight: "70vh" }}>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 6 }}>{tr("News")}</div>
      <Segmented testid="news-tabs" value={tab} onChange={setTab} options={[["general", tr("General")], ["racing", tr("Racing")], ["gulf", tr("Gulf")]]} />
      <TabSlide index={i}>
        {list.length === 0 ? (
          <EmptyState icon={<Rss size={20} color={T.textDim} />} title={tr("Nothing here yet")} body={tr("Check back soon.")} />
        ) : (
          list.map((n) => <NewsCard key={n.id} item={n} me={me} onLike={onLike} />)
        )}
      </TabSlide>
      {list.length > 0 && <div style={{ color: T.textDim, fontSize: 11, textAlign: "center", padding: "6px 0 16px", lineHeight: 1.5 }}>{tr("Headlines from each publisher's site. Tap one to read it there.")}</div>}
    </div>
  );
}

export function NewsCard({ item, me, onLike, compact }) {
  const liked = item.likes.includes(me);
  const [pop, setPop] = useState(false);
  const doLike = () => { onLike(item.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div data-testid="news-card" data-news-id={item.id} dir={item.lang === "ar" ? "rtl" : undefined} style={{ borderRadius: 14, marginBottom: compact ? 10 : 14, paddingBottom: compact ? 10 : 14, borderBottom: compact ? "none" : `1px solid ${T.lineDark}` }}>
      {!compact && item.image && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginBottom: 10 }}>
          <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
            style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 16, display: "block", background: T.surface2 }} />
        </a>
      )}
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

// ---------- Tracks near you ----------
const KIND_LABEL = { circuit: "Circuit", drag: "Drag strip", karting: "Karting", offroad: "Off-road" };

export function TracksScreen() {
  const [list, setList] = useState(null);
  const [area, setArea] = useState(null);
  const [kind, setKind] = useState("all");
  const [locating, setLocating] = useState(false);
  useEffect(() => { loadTracks().then(setList); loadArea().then((a) => a && setArea(a)); }, []);

  // Same "my area" as meets: stays on this phone.
  const useMine = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let next = { label: tr("your location"), city: "", country: "", lat, lng };
      try { const p = await reversePlace(lat, lng); if (p) next = { ...next, city: p.city, country: p.country, label: p.city || next.label }; } catch { /* keep */ }
      setArea(next); saveArea(next); setLocating(false);
    }, (err) => { setLocating(false); handleLocationError(err); }, { timeout: 12000 });
  };

  const kinds = list ? ["all", ...new Set(list.map((t) => t.kind))] : [];
  const shown = (list || [])
    .filter((t) => kind === "all" || t.kind === kind)
    .map((t) => ({ ...t, km: area && area.lat != null ? distanceKm(area, t) : null }))
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9) || a.name.localeCompare(b.name));
  const km = (n) => (n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString(locale()));

  return (
    <div>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 4 }}>{tr("Tracks")}</div>
      <div style={{ color: T.textDim, fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>{tr("Take it to the track. Check each track's site for open track days and drag nights.")}</div>
      <button data-testid="tracks-locate" onClick={useMine} disabled={locating} className="press" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontWeight: 600, fontSize: 13.5, marginBottom: 12 }}>
        {locating ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <LocateFixed size={15} color={T.accent2} />}
        {area ? tr("Sorted by distance from {0}", area.label || area.city || tr("your area")) : tr("Sort by distance from me")}
      </button>
      {kinds.length > 2 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {kinds.map((k) => (
            <button key={k} data-testid={`track-kind-${k}`} onClick={() => setKind(k)} className="press" style={{ padding: "7px 13px", borderRadius: 999, border: `1px solid ${kind === k ? T.accent : T.lineDark}`, background: kind === k ? "rgba(212,67,77,0.14)" : T.surface, color: T.text, fontSize: 12.5, fontWeight: 600 }}>
              {k === "all" ? tr("All") : tr(KIND_LABEL[k] || k)}
            </button>
          ))}
        </div>
      )}
      {list === null ? null : shown.length === 0 ? (
        <EmptyState icon={<Flag size={20} color={T.textDim} />} title={tr("No tracks yet")} body={tr("Check back soon.")} />
      ) : shown.map((t) => (
        <div key={t.id} data-testid="track-card" style={{ padding: 16, marginBottom: 12, borderRadius: 22, border: `1px solid ${T.lineDark}`, background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`, boxShadow: T.shadowCard }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <IconBadge size={42} tone={t.kind === "drag" ? "warm" : t.kind === "karting" ? "accent" : "accent2"}><Flag size={18} color={T.text} /></IconBadge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.text, fontSize: 15.5, fontWeight: 700 }}>{t.name}</div>
              <div className="plate" style={{ color: T.textDim, fontSize: 10.5, marginTop: 4 }}>
                {tr(KIND_LABEL[t.kind] || t.kind)} · {[t.city, t.country].filter(Boolean).join(", ")}
              </div>
            </div>
            {t.km != null && <div data-testid="track-km" className="plate" style={{ color: T.accent2, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{tr("{0} km", km(t.km))}</div>}
          </div>
          {t.about && <div style={{ color: T.textDim, fontSize: 13, lineHeight: 1.45, marginTop: 10 }}>{tr(t.about)}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <a href={directionsUrl(t.lat, t.lng)} target="_blank" rel="noopener noreferrer" className="press" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 14, background: T.accent, color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              <Navigation size={14} /> {tr("Directions")}
            </a>
            {t.website && (
              <a href={t.website} target="_blank" rel="noopener noreferrer" className="press" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
                <Globe size={14} /> {tr("Website")}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
