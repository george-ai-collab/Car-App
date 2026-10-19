import { useState } from "react";
import { Plus, Heart, Rss, Calendar, Users, ExternalLink, Search, ChevronRight } from "lucide-react";
import { T } from "../theme";
import { timeAgo } from "../lib/utils";
import { Avatar, TabButton, IconBadge, EmptyState, TextInput, SectionLabel } from "../components/ui";
import { CarCard } from "./Cars";
import { CommunityCard } from "./Communities";
import { MeetCard } from "./Meets";

export function DiscoverView(props) {
  const {
    me, cars, users, news, meets, communities,
    openCar, openProfile, openCommunity, onLikeNews, onToggleGoing, onToggleCommunity,
    onOpenSearch, onOpenCommunities, onOpenMeets, onOpenNews,
  } = props;

  const communityList = Object.values(communities).sort((a, b) => b.members.length - a.members.length);
  const meetList = Object.values(meets).sort((a, b) => (a.when || "").localeCompare(b.when || ""));
  const newsAll = Object.values(news).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ paddingTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div className="display" style={{ fontSize: 22, color: T.text }}>Discover</div>
        <button onClick={onOpenSearch} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 999, padding: 9 }}>
          <Search size={17} color={T.text} />
        </button>
      </div>

      <DivisionCard title="Communities" icon={<Users size={15} color={T.accent} />} tone="accent" onSeeAll={onOpenCommunities}>
        {communityList.length === 0 ? (
          <div style={{ color: T.textDim, fontSize: 13 }}>No communities yet.</div>
        ) : (
          communityList.slice(0, 2).map((c) => <CommunityCard key={c.id} community={c} me={me} onToggle={onToggleCommunity} onOpen={openCommunity} compact />)
        )}
      </DivisionCard>

      <DivisionCard title="Meets" icon={<Calendar size={15} color={T.accent2} />} tone="teal" onSeeAll={onOpenMeets}>
        {meetList.length === 0 ? (
          <div style={{ color: T.textDim, fontSize: 13 }}>No meets posted.</div>
        ) : (
          meetList.slice(0, 1).map((m) => <MeetCard key={m.id} meet={m} me={me} onToggleGoing={onToggleGoing} />)
        )}
      </DivisionCard>

      <DivisionCard title="News" icon={<Rss size={15} color={T.accent} />} tone="accent" onSeeAll={onOpenNews}>
        {newsAll.length === 0 ? (
          <div style={{ color: T.textDim, fontSize: 13 }}>Nothing here yet.</div>
        ) : (
          newsAll.slice(0, 2).map((n) => <NewsCard key={n.id} item={n} me={me} onLike={onLikeNews} compact />)
        )}
      </DivisionCard>
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
          See all <ChevronRight size={14} />
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
  const matchedCars = query ? Object.values(cars).filter((c) => `${c.make} ${c.model} ${c.year}`.toLowerCase().includes(query)) : [];
  const matchedCommunities = query ? Object.values(communities).filter((c) => c.name.toLowerCase().includes(query)) : [];
  const noResults = query && matchedUsers.length === 0 && matchedCars.length === 0 && matchedCommunities.length === 0;

  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 14 }}>Search</div>
      <TextInput value={q} onChange={setQ} placeholder="Find a person, car, or community…" icon={<Search size={14} />} autoFocus />
      {noResults && <div style={{ color: T.textDim, fontSize: 13, marginTop: 20 }}>No matches for "{q}"</div>}
      {matchedCommunities.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>Communities</SectionLabel>
          {matchedCommunities.map((c) => <CommunityCard key={c.id} community={c} me={me} onToggle={onToggleCommunity} onOpen={openCommunity} />)}
        </div>
      )}
      {matchedUsers.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>People</SectionLabel>
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
          <SectionLabel>Cars</SectionLabel>
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
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 14 }}>Communities</div>
      <button onClick={onCreate} style={{ width: "100%", marginBottom: 14, padding: "10px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Plus size={14} /> Start a community
      </button>
      {list.length === 0 ? (
        <EmptyState icon={<Users size={20} color={T.textDim} />} title="No communities yet" body="Add a car or start one yourself." />
      ) : (
        list.map((c) => <CommunityCard key={c.id} community={c} me={me} onToggle={onToggle} onOpen={onOpen} />)
      )}
    </div>
  );
}

export function MeetsScreen({ me, meets, onToggleGoing, onPost, onEdit, onDelete }) {
  const list = Object.values(meets).sort((a, b) => (a.when || "").localeCompare(b.when || ""));
  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 14 }}>Meets</div>
      <button onClick={onPost} style={{ width: "100%", marginBottom: 14, padding: "10px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Plus size={14} /> Post a meet
      </button>
      {list.length === 0 ? (
        <EmptyState icon={<Calendar size={20} color={T.textDim} />} title="No meets posted" body="Post one you're planning to go to." />
      ) : (
        list.map((m) => <MeetCard key={m.id} meet={m} me={me} onToggleGoing={onToggleGoing} onEdit={onEdit} onDelete={onDelete} />)
      )}
    </div>
  );
}

export function NewsScreen({ me, news, onLike }) {
  const [tab, setTab] = useState("general");
  const list = Object.values(news).filter((n) => n.category === tab).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 14 }}>News</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TabButton active={tab === "general"} onClick={() => setTab("general")} label="General" />
        <TabButton active={tab === "racing"} onClick={() => setTab("racing")} label="Racing" />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Rss size={20} color={T.textDim} />} title="Nothing here yet" body="Check back soon." />
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
