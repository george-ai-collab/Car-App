import { useEffect, useState } from "react";
import { Plus, Heart, Rss, Calendar, Users, ExternalLink, Search, ChevronRight, ScanLine, Flag, Navigation, Globe, LocateFixed, Loader2 } from "lucide-react";
import { T } from "../theme";
import { timeAgo } from "../lib/utils";
import { Avatar, IconBadge, EmptyState, TextInput, SectionLabel, Segmented } from "../components/ui";
import { useSwipe } from "../lib/useSwipe";
import { CarCard } from "./Cars";
import { CommunityCard } from "./Communities";
import { tr, locale } from "../lib/i18n";
import { tracks as loadTracks, refreshNews } from "../lib/catalog";
import { distanceKm, loadArea, saveArea, directionsUrl, reversePlace } from "../lib/geo";
import { handleLocationError } from "../lib/permissions";

// Discover is a set of doors: tap one to open that section (like the + menu).
export function DiscoverView({ meets, communities, news, onOpenSearch, onOpenCommunities, onOpenMeets, onOpenNews, onOpenTracks, onScan }) {
  const upcoming = Object.values(meets).filter((m) => !m.when || new Date(m.when) >= new Date()).length;
  const tiles = [
    { id: "meets", title: tr("Meets"), sub: tr("Find meets near you, or anywhere in the world"), count: tr("{0} upcoming", upcoming), icon: <Calendar size={24} color="#BFE0EC" />, tone: "accent2", onClick: onOpenMeets },
    { id: "communities", title: tr("Communities"), sub: tr("Your make, your scene, your people"), count: tr("{0} communities", Object.keys(communities).length), icon: <Users size={24} color={T.accent} />, tone: "accent", onClick: onOpenCommunities },
    { id: "tracks", title: tr("Tracks"), sub: tr("Race tracks, drag strips and karting near you"), count: tr("Track days and drag nights"), icon: <Flag size={24} color="#BFE0EC" />, tone: "accent2", onClick: onOpenTracks },
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

const NEWS_TABS = ["general", "racing", "gulf"];
export function NewsScreen({ me, news, onLike, onRefresh }) {
  const [tab, setTab] = useState("general");
  const i = NEWS_TABS.indexOf(tab);
  const sw = useSwipe({ onLeft: () => setTab(NEWS_TABS[Math.min(i + 1, 2)]), onRight: () => setTab(NEWS_TABS[Math.max(i - 1, 0)]) });
  // Opening News asks the server for fresh headlines (it only fetches if they're 3+ hours old).
  useEffect(() => { refreshNews().then(() => onRefresh && onRefresh()); }, []);
  const list = Object.values(news).filter((n) => n.category === tab).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div {...sw.bind} style={{ ...sw.bind.style, minHeight: "70vh" }}>
      <div className="display" style={{ fontSize: 24, color: T.text, marginBottom: 6 }}>{tr("News")}</div>
      <Segmented testid="news-tabs" value={tab} onChange={setTab} options={[["general", tr("General")], ["racing", tr("Racing")], ["gulf", tr("Gulf")]]} />
      {list.length === 0 ? (
        <EmptyState icon={<Rss size={20} color={T.textDim} />} title={tr("Nothing here yet")} body={tr("Check back soon.")} />
      ) : (
        list.map((n) => <NewsCard key={n.id} item={n} me={me} onLike={onLike} />)
      )}
      {list.length > 0 && <div style={{ color: T.textDim, fontSize: 11, textAlign: "center", padding: "6px 0 16px", lineHeight: 1.5 }}>{tr("Headlines from each publisher's site. Tap one to read it there.")}</div>}
    </div>
  );
}

export function NewsCard({ item, me, onLike, compact }) {
  const liked = item.likes.includes(me);
  const [pop, setPop] = useState(false);
  const doLike = () => { onLike(item.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div data-testid="news-card" dir={item.lang === "ar" ? "rtl" : undefined} style={{ marginBottom: compact ? 10 : 14, paddingBottom: compact ? 10 : 14, borderBottom: compact ? "none" : `1px solid ${T.lineDark}` }}>
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
            <button key={k} data-testid={`track-kind-${k}`} onClick={() => setKind(k)} className="press" style={{ padding: "7px 13px", borderRadius: 999, border: `1px solid ${kind === k ? T.accent : T.lineDark}`, background: kind === k ? "rgba(230,56,70,0.14)" : T.surface, color: T.text, fontSize: 12.5, fontWeight: 600 }}>
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
