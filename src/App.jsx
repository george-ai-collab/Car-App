import { useState, useEffect, useCallback, useRef } from "react";
import {
  Car, Plus, Compass, User, ArrowLeft, MapPin, Wrench,
  Clock, Image as ImageIcon, Loader2, Heart, MessageCircle, Check,
  Rss, Calendar, Users, ExternalLink, Search, Bell, ChevronRight, Award, Camera, Pencil, Trash2
} from "lucide-react";

// ---------- design tokens ----------
const T = {
  bg: "#0A0A0B",
  surface: "#18181B",
  surface2: "#221F20",
  paper: "#F6F5F3",
  paper2: "#E7E4E0",
  ink: "#141414",
  inkMuted: "#5C5A57",
  text: "#F5F4F2",
  textDim: "#9C9A97",
  accent: "#E63846",
  accent2: "#457B90",
  accentDeep: "#881E2D",
  accentWarm: "#F2B84B",
  lineDark: "rgba(245,244,242,0.10)",
  linePaper: "rgba(20,20,20,0.12)",
  shadowCard: "0 2px 10px rgba(0,0,0,0.32), 0 1px 2px rgba(0,0,0,0.4)",
  shadowRaised: "0 8px 24px rgba(0,0,0,0.4)",
  shadowAccent: "0 4px 14px rgba(230,56,70,0.3)",
  glassBg: "rgba(24,24,27,0.55)",
  glassBorder: "rgba(255,255,255,0.14)",
  glassHighlight: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const FONT_STACK = "'Barlow Semi Condensed','Arial Narrow',ui-sans-serif,system-ui,sans-serif";
const BODY_STACK = "'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif";
const MONO_STACK = "'IBM Plex Mono','SFMono-Regular',ui-monospace,monospace";

const CAR_KEY = "carfooly-cars";
const POST_KEY = "carfooly-posts";
const USER_KEY = "carfooly-users";
const NEWS_KEY = "carfooly-news";
const MEET_KEY = "carfooly-meets";
const COMMUNITY_KEY = "carfooly-communities";
const NOTIF_KEY = "carfooly-notifications";
const SIGHT_KEY = "carfooly-sightings";
const ME_KEY = "carfooly-me";

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}
function fmtWhen(val) {
  if (!val) return "";
  try {
    return new Date(val).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return val; }
}
function hueForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

const SPOT_BADGES = [
  { count: 1, name: "First Find", tone: "warm" },
  { count: 5, name: "Spotter", tone: "warm" },
  { count: 15, name: "Scout", tone: "accent2" },
  { count: 30, name: "Hunter", tone: "accent2" },
  { count: 75, name: "Legend", tone: "accent" },
];
const VARIETY_BADGES = [
  { count: 3, name: "Explorer", tone: "warm" },
  { count: 6, name: "Collector", tone: "accent2" },
  { count: 10, name: "Connoisseur", tone: "accent" },
];

function spotStats(username, cars, sightings) {
  const spottedCars = Object.values(cars).filter((c) => c.spotterUsernames.includes(username));
  const unmatchedSightings = Object.values(sightings || {}).filter((s) => s.spotterUsername === username && !s.matchedCarId);
  const spotCount = spottedCars.length + unmatchedSightings.length;
  const makes = new Set([
    ...spottedCars.map((c) => c.make.toLowerCase()),
    ...unmatchedSightings.map((s) => s.make.toLowerCase()),
  ]);
  return { spotCount, uniqueMakes: makes.size };
}
function computeBadges(username, cars, sightings) {
  const { spotCount, uniqueMakes } = spotStats(username, cars, sightings);
  const earned = [];
  for (const b of SPOT_BADGES) if (spotCount >= b.count) earned.push({ ...b, kind: "spot" });
  for (const b of VARIETY_BADGES) if (uniqueMakes >= b.count) earned.push({ ...b, kind: "variety" });
  return earned;
}
function nextBadgeProgress(username, cars, sightings) {
  const { spotCount } = spotStats(username, cars, sightings);
  const next = SPOT_BADGES.find((b) => spotCount < b.count);
  return next ? { needed: next.count - spotCount, name: next.name } : null;
}

function verbPhrase(t) {
  if (t.type === "created") return "added this car to Carfooly";
  if (t.type === "mod") return `added ${t.modName || t.detail || "a mod"}`;
  if (t.type === "spot") return "spotted this car";
  if (t.type === "post") return t.detail ? `posted: "${t.detail}"` : "posted a photo";
  if (t.type === "followBuild") return "started following this build";
  return "";
}

const SEED_NEWS = [
  {
    id: "seed-n1", category: "general",
    title: "Porsche Is Bringing Back the Manual 911 Carrera S — But Only for North America",
    url: "https://www.edmunds.com/car-news/2027-porsche-911-carrera-s-manual-debut-first-look.html",
    source: "edmunds.com", note: "Six-speed manual returns to the Carrera S, exclusive to North America.",
    date: "2026-08-13T12:00:00.000Z",
  },
  {
    id: "seed-n2", category: "general",
    title: "McLaren Reveals 'Luxury Boutique' Showroom Redesign, New Corporate Identity, 810-HP Hybrid Coupe",
    url: "https://www.autonews.com/news/an-mclaren-reveals-new-brand-identity-product-roadmap-0910/",
    source: "autonews.com", note: "McLaren leans into founder Bruce McLaren's racing roots with a new dealer experience and the P34 hybrid.",
    date: "2026-09-10T12:00:00.000Z",
  },
  {
    id: "seed-n3", category: "general",
    title: "McLaren Is Working on an 810 HP Hybrid Coupe That Could Arrive as Soon as Next Year",
    url: "https://robbreport.com/motors/cars/new-mclaren-810-hp-hybrid-coupe-1238637898/",
    source: "robbreport.com", note: "Codenamed P34 — sits between the Artura and 750S, in-house hybrid V6.",
    date: "2026-09-11T12:00:00.000Z",
  },
  {
    id: "seed-r1", category: "racing",
    title: "F1 Spanish GP: Lando Norris Takes Stunning Pole at Madring",
    url: "https://www.motorsport.com/f1/news/f1-spanish-gp-10854999/10854999/",
    source: "motorsport.com", note: "Norris pips Antonelli by 0.011s on F1's first-ever visit to the new Madring circuit.",
    date: "2026-09-12T15:19:00.000Z",
  },
  {
    id: "seed-r2", category: "racing",
    title: "Norris Snatches First Madring Spanish GP Pole from Antonelli",
    url: "https://www.the-race.com/formula-1/f1-spanish-grand-prix-qualifying-norris-beats-antonelli-pole/",
    source: "the-race.com", note: "\"Probably one of the best laps I've ever done,\" says Norris after his third pole of 2026.",
    date: "2026-09-12T12:00:00.000Z",
  },
  {
    id: "seed-r3", category: "racing",
    title: "\"F1 Cannot Continue This Way\" — Fernando Alonso Sounds the Alarm at Spanish GP Home Race",
    url: "https://www.autosport.com/f1/",
    source: "autosport.com", note: "Alonso weighs in as the grid heads into a new circuit for the Spanish Grand Prix weekend.",
    date: "2026-09-13T09:00:00.000Z",
  },
];

export default function App() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [cars, setCars] = useState({});
  const [posts, setPosts] = useState({});
  const [users, setUsers] = useState({});
  const [news, setNews] = useState({});
  const [meets, setMeets] = useState({});
  const [communities, setCommunities] = useState({});
  const [notifications, setNotifications] = useState({});
  const [sightings, setSightings] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  const [view, setView] = useState("feed");
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [selectedMeetId, setSelectedMeetId] = useState(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [carOrigin, setCarOrigin] = useState("feed");
  const [profileTab, setProfileTab] = useState("posts");
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [postOrigin, setPostOrigin] = useState("feed");
  const [searchOrigin, setSearchOrigin] = useState("discover");
  const [feedTab, setFeedTab] = useState("foryou");
  const [toast, setToast] = useState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    try {
      const [c, p, u, n, m, co, nf, sg] = await Promise.all([
        window.storage.get(CAR_KEY, true).catch(() => null),
        window.storage.get(POST_KEY, true).catch(() => null),
        window.storage.get(USER_KEY, true).catch(() => null),
        window.storage.get(NEWS_KEY, true).catch(() => null),
        window.storage.get(MEET_KEY, true).catch(() => null),
        window.storage.get(COMMUNITY_KEY, true).catch(() => null),
        window.storage.get(NOTIF_KEY, true).catch(() => null),
        window.storage.get(SIGHT_KEY, true).catch(() => null),
      ]);
      setCars(c ? JSON.parse(c.value) : {});
      setPosts(p ? JSON.parse(p.value) : {});
      setUsers(u ? JSON.parse(u.value) : {});
      const storedNews = n ? JSON.parse(n.value) : {};
      const seedBase = {};
      SEED_NEWS.forEach((item) => { seedBase[item.id] = { ...item, submittedBy: null, likes: [] }; });
      setNews({ ...seedBase, ...storedNews });
      const rawMeets = m ? JSON.parse(m.value) : {};
      const normalizedMeets = {};
      Object.values(rawMeets).forEach((meet) => {
        if (Array.isArray(meet.attendees)) {
          normalizedMeets[meet.id] = meet;
        } else if (Array.isArray(meet.goingUsernames)) {
          normalizedMeets[meet.id] = {
            ...meet,
            attendees: meet.goingUsernames.map((u) => ({ username: u, role: "attendee" })),
          };
        } else {
          normalizedMeets[meet.id] = { ...meet, attendees: [] };
        }
      });
      setMeets(normalizedMeets);
      setCommunities(co ? JSON.parse(co.value) : {});
      setNotifications(nf ? JSON.parse(nf.value) : {});
      setSightings(sg ? JSON.parse(sg.value) : {});
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      try {
        const res = await window.storage.get(ME_KEY, false);
        setMe(res ? res.value : null);
      } catch { setMe(null); }
      setLoadingMe(false);
    })();
    loadAll();
  }, [loadAll]);

  const saveCars = async (next) => {
    setCars(next);
    try { await window.storage.set(CAR_KEY, JSON.stringify(next), true); }
    catch { flash("Couldn't save. Try again."); }
  };
  const savePosts = async (next) => {
    setPosts(next);
    try { await window.storage.set(POST_KEY, JSON.stringify(next), true); }
    catch { flash("Couldn't save. Try again."); }
  };
  const saveUsers = async (next) => {
    setUsers(next);
    try { await window.storage.set(USER_KEY, JSON.stringify(next), true); }
    catch { flash("Couldn't save. Try again."); }
  };
  const saveNews = async (next) => {
    setNews(next);
    try { await window.storage.set(NEWS_KEY, JSON.stringify(next), true); }
    catch { flash("Couldn't save. Try again."); }
  };
  const saveMeets = async (next) => {
    setMeets(next);
    try { await window.storage.set(MEET_KEY, JSON.stringify(next), true); }
    catch { flash("Couldn't save. Try again."); }
  };
  const saveCommunities = async (next) => {
    setCommunities(next);
    try { await window.storage.set(COMMUNITY_KEY, JSON.stringify(next), true); }
    catch { flash("Couldn't save. Try again."); }
  };
  const saveNotifications = async (next) => {
    setNotifications(next);
    try { await window.storage.set(NOTIF_KEY, JSON.stringify(next), true); }
    catch { /* silent — notifications aren't critical enough to interrupt with a toast */ }
  };
  const pushNotif = async (toUsername, notif) => {
    if (!toUsername || toUsername === me) return;
    const list = notifications[toUsername] || [];
    const next = { ...notifications, [toUsername]: [{ id: uid("n"), date: new Date().toISOString(), read: false, ...notif }, ...list] };
    await saveNotifications(next);
  };

  const saveSightings = async (next) => {
    setSightings(next);
    try { await window.storage.set(SIGHT_KEY, JSON.stringify(next), true); }
    catch { flash("Couldn't save. Try again."); }
  };

  const logSighting = async ({ make, model, year, trim, photoUrl }) => {
    const id = uid("sighting");
    const now = new Date().toISOString();
    const matched = Object.values(cars).find((c) =>
      c.make.toLowerCase() === make.trim().toLowerCase() &&
      c.model.toLowerCase() === model.trim().toLowerCase() &&
      c.year.trim() === year.trim()
    );

    const sighting = {
      id, spotterUsername: me, make: make.trim(), model: model.trim(), year: year.trim(), trim: trim.trim(),
      photoUrl, verified: false, matchedCarId: matched ? matched.id : null, date: now,
    };
    await saveSightings({ ...sightings, [id]: sighting });

    if (matched && matched.ownerUsername !== me && !matched.spotterUsernames.includes(me)) {
      const updatedCar = {
        ...matched,
        spotterUsernames: [...matched.spotterUsernames, me],
        timeline: [...matched.timeline, { id: uid("t"), type: "spot", by: me, date: now }],
      };
      await saveCars({ ...cars, [matched.id]: updatedCar });
      await pushNotif(matched.ownerUsername, { type: "spot", from: me, carId: matched.id });
    }

    flash(matched ? "Logged. Matched to an existing car." : "Logged. Nice find.");
  };

  const claimUsername = async (handle, displayName) => {
    const clean = handle.trim().replace(/^@/, "");
    if (!clean) return;
    try {
      await window.storage.set(ME_KEY, clean, false);
      setMe(clean);
      const existing = users[clean];
      await saveUsers({
        ...users,
        [clean]: existing
          ? { ...existing, name: displayName.trim() || existing.name || clean }
          : { name: displayName.trim() || clean, joinedAt: new Date().toISOString(), followers: [], following: [] },
      });
    } catch { flash("Couldn't save your name. Try again."); }
  };

  const addCar = async ({ make, model, year, nickname, photoUrl, engine, power, gearbox, weight, wheels, zeroToSixty, topSpeed, note, noteDetail }) => {
    const id = uid("car");
    const now = new Date().toISOString();
    const timeline = [{ id: uid("t"), type: "created", by: me, date: now }];
    const mods = [];
    if (note.trim()) {
      mods.push({ id: uid("m"), name: note.trim(), note: noteDetail.trim(), date: now });
      timeline.push({ id: uid("t"), type: "mod", by: me, date: now, modName: note.trim(), modNote: noteDetail.trim() });
    }
    const car = {
      id, make: make.trim(), model: model.trim(), year: year.trim(), nickname: nickname.trim(),
      engine: engine.trim(), power: power.trim(), gearbox: gearbox.trim(), weight: weight.trim(), wheels: wheels.trim(),
      zeroToSixty: zeroToSixty.trim(), topSpeed: topSpeed.trim(),
      ownerUsername: me, photoUrl: photoUrl.trim() || null, createdAt: now,
      mods, timeline, spotterUsernames: [], followerUsernames: [],
    };
    await saveCars({ ...cars, [id]: car });

    const brand = make.trim();
    const existing = Object.values(communities).find((c) => c.kind === "brand" && c.name.toLowerCase() === brand.toLowerCase());
    if (existing) {
      if (!existing.members.includes(me)) {
        await saveCommunities({ ...communities, [existing.id]: { ...existing, members: [...existing.members, me] } });
      }
    } else if (brand) {
      const cid = uid("community");
      const community = {
        id: cid, name: brand, description: `Everything ${brand}.`, kind: "brand",
        createdBy: null, members: [me], createdAt: now,
      };
      await saveCommunities({ ...communities, [cid]: community });
    }

    setSelectedCarId(id);
    setView("car");
    flash("Car added");
  };

  const addMod = async (carId, name, note) => {
    const car = cars[carId];
    if (!car || !name.trim()) return;
    const now = new Date().toISOString();
    const updated = {
      ...car,
      mods: [...car.mods, { id: uid("m"), name: name.trim(), note: (note || "").trim(), date: now }],
      timeline: [...car.timeline, { id: uid("t"), type: "mod", by: me, date: now, modName: name.trim(), modNote: (note || "").trim() }],
    };
    await saveCars({ ...cars, [carId]: updated });
    flash("Build updated");
  };

  const toggleFollowCar = async (carId) => {
    const car = cars[carId];
    if (!car || car.ownerUsername === me) return;
    const fans = car.followerUsernames || [];
    const following = fans.includes(me);
    const updated = { ...car, followerUsernames: following ? fans.filter((u) => u !== me) : [...fans, me] };
    await saveCars({ ...cars, [carId]: updated });
    if (!following) await pushNotif(car.ownerUsername, { type: "followBuild", from: me, carId });
  };

  const spotCar = async (carId) => {
    const car = cars[carId];
    if (!car || car.spotterUsernames.includes(me) || car.ownerUsername === me) return;
    const now = new Date().toISOString();
    const updated = {
      ...car,
      spotterUsernames: [...car.spotterUsernames, me],
      timeline: [...car.timeline, { id: uid("t"), type: "spot", by: me, date: now }],
    };
    await saveCars({ ...cars, [carId]: updated });
    await pushNotif(car.ownerUsername, { type: "spot", from: me, carId });
    flash("Logged. Nice find.");
  };

  const createPost = async ({ carId, photoUrl, caption, communityId }) => {
    const car = cars[carId];
    if (!car) return;
    const id = uid("post");
    const now = new Date().toISOString();
    const post = {
      id, carId, authorUsername: me, photoUrl: photoUrl.trim() || null,
      caption: caption.trim(), date: now, likes: [], comments: [], communityId: communityId || null,
    };
    await savePosts({ ...posts, [id]: post });

    let updatedCar = {
      ...car,
      timeline: [...car.timeline, { id: uid("t"), type: "post", by: me, date: now, detail: caption.trim() }],
    };
    if (car.ownerUsername !== me && !car.spotterUsernames.includes(me)) {
      updatedCar = {
        ...updatedCar,
        spotterUsernames: [...updatedCar.spotterUsernames, me],
        timeline: [...updatedCar.timeline, { id: uid("t"), type: "spot", by: me, date: now }],
      };
    }
    await saveCars({ ...cars, [carId]: updatedCar });
    setView("feed");
    flash("Posted");
  };

  const toggleLike = async (postId) => {
    const post = posts[postId];
    if (!post) return;
    const has = post.likes.includes(me);
    const updated = { ...post, likes: has ? post.likes.filter((u) => u !== me) : [...post.likes, me] };
    await savePosts({ ...posts, [postId]: updated });
    if (!has) await pushNotif(post.authorUsername, { type: "like", from: me, postId });
  };

  const addComment = async (postId, text) => {
    const post = posts[postId];
    if (!post || !text.trim()) return;
    const updated = {
      ...post,
      comments: [...post.comments, { id: uid("c"), author: me, text: text.trim(), date: new Date().toISOString(), replies: [] }],
    };
    await savePosts({ ...posts, [postId]: updated });
    await pushNotif(post.authorUsername, { type: "comment", from: me, postId, text: text.trim().slice(0, 60) });
  };

  const addReply = async (postId, commentId, text) => {
    const post = posts[postId];
    if (!post || !text.trim()) return;
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) return;
    const reply = { id: uid("r"), author: me, text: text.trim(), date: new Date().toISOString() };
    const updated = {
      ...post,
      comments: post.comments.map((c) => c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c),
    };
    await savePosts({ ...posts, [postId]: updated });
    if (comment.author !== me) {
      await pushNotif(comment.author, { type: "reply", from: me, postId, text: text.trim().slice(0, 60) });
    }
  };

  const toggleFollow = async (target) => {
    if (target === me) return;
    const meRec = users[me] || { joinedAt: new Date().toISOString(), followers: [], following: [] };
    const themRec = users[target] || { joinedAt: new Date().toISOString(), followers: [], following: [] };
    const isFollowing = meRec.following.includes(target);
    const nextMe = { ...meRec, following: isFollowing ? meRec.following.filter((u) => u !== target) : [...meRec.following, target] };
    const nextThem = { ...themRec, followers: isFollowing ? themRec.followers.filter((u) => u !== me) : [...themRec.followers, me] };
    await saveUsers({ ...users, [me]: nextMe, [target]: nextThem });
    if (!isFollowing) await pushNotif(target, { type: "follow", from: me });
  };

  const toggleNewsLike = async (id) => {
    const item = news[id];
    if (!item) return;
    const has = item.likes.includes(me);
    const updated = { ...item, likes: has ? item.likes.filter((u) => u !== me) : [...item.likes, me] };
    await saveNews({ ...news, [id]: updated });
  };

  const submitMeet = async ({ title, location, when, note }, editingId) => {
    if (!title.trim() || !location.trim() || !when) return;
    if (editingId) {
      const existing = meets[editingId];
      if (!existing || existing.submittedBy !== me) return;
      await saveMeets({ ...meets, [editingId]: { ...existing, title: title.trim(), location: location.trim(), when, note: note.trim() } });
      setView("discover");
      flash("Meet updated");
      return;
    }
    const id = uid("meet");
    const item = {
      id, title: title.trim(), location: location.trim(), when,
      note: note.trim(), submittedBy: me, createdAt: new Date().toISOString(),
      attendees: [{ username: me, role: "organizer" }],
    };
    await saveMeets({ ...meets, [id]: item });
    setView("discover");
    flash("Meet posted");
  };

  const deleteMeet = async (id) => {
    const meet = meets[id];
    if (!meet || meet.submittedBy !== me) return;
    const { [id]: _removed, ...rest } = meets;
    await saveMeets(rest);
    flash("Meet removed");
  };

  const toggleGoing = async (id, role) => {
    const item = meets[id];
    if (!item) return;
    const existing = item.attendees.find((a) => a.username === me);
    let attendees;
    if (existing && existing.role === role) {
      attendees = item.attendees.filter((a) => a.username !== me);
    } else if (existing) {
      attendees = item.attendees.map((a) => (a.username === me ? { ...a, role } : a));
    } else {
      attendees = [...item.attendees, { username: me, role }];
    }
    await saveMeets({ ...meets, [id]: { ...item, attendees } });
  };

  const createCommunity = async ({ name, description }) => {
    if (!name.trim()) return;
    const id = uid("community");
    const community = {
      id, name: name.trim(), description: description.trim(), kind: "custom",
      createdBy: me, members: [me], createdAt: new Date().toISOString(),
    };
    await saveCommunities({ ...communities, [id]: community });
    setView("discover");
    flash("Community created");
  };

  const toggleCommunityMembership = async (id) => {
    const c = communities[id];
    if (!c) return;
    const inIt = c.members.includes(me);
    const updated = { ...c, members: inIt ? c.members.filter((u) => u !== me) : [...c.members, me] };
    await saveCommunities({ ...communities, [id]: updated });
  };

  const markNotificationsRead = async () => {
    const mine = notifications[me] || [];
    if (mine.every((n) => n.read)) return;
    await saveNotifications({ ...notifications, [me]: mine.map((n) => ({ ...n, read: true })) });
  };

  const openProfile = (username) => { setSelectedUsername(username); setView("profile"); };
  const openCar = (carId) => { setCarOrigin(view); setSelectedCarId(carId); setView("car"); };
  const openCommunity = (id) => { setSelectedCommunityId(id); setView("communityPage"); };
  const openPost = (postId) => { setPostOrigin(view); setSelectedPostId(postId); setView("postDetail"); };

  const loading = loadingMe || dataLoading;

  return (
    <div style={{ fontFamily: BODY_STACK, background: T.bg, minHeight: "100vh" }}>
      <GlobalStyle />
      {loading ? (
        <LoadingScreen />
      ) : !me ? (
        <Onboarding onSubmit={claimUsername} />
      ) : (
        <Shell
          me={me} cars={cars} posts={posts} users={users} news={news} meets={meets} communities={communities}
          view={view} setView={setView}
          selectedCarId={selectedCarId} selectedUsername={selectedUsername} selectedPostId={selectedPostId} postOrigin={postOrigin}
          selectedMeetId={selectedMeetId} setSelectedMeetId={setSelectedMeetId}
          selectedCommunityId={selectedCommunityId} openCommunity={openCommunity}
          carOrigin={carOrigin} profileTab={profileTab} setProfileTab={setProfileTab}
          deleteMeet={deleteMeet}
          searchOrigin={searchOrigin} setSearchOrigin={setSearchOrigin}
          feedTab={feedTab} setFeedTab={setFeedTab}
          addCar={addCar} addMod={addMod} spotCar={spotCar} toggleFollowCar={toggleFollowCar}
          createPost={createPost} toggleLike={toggleLike} addComment={addComment} addReply={addReply} toggleFollow={toggleFollow}
          toggleNewsLike={toggleNewsLike}
          submitMeet={submitMeet} toggleGoing={toggleGoing}
          createCommunity={createCommunity} toggleCommunityMembership={toggleCommunityMembership}
          notifications={notifications} markNotificationsRead={markNotificationsRead}
          sightings={sightings} logSighting={logSighting}
          openProfile={openProfile} openCar={openCar} openPost={openPost}
          toast={toast}
        />
      )}
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      *::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; -ms-overflow-style: none; }
      button { font-family: inherit; cursor: pointer; }
      input, textarea { font-family: inherit; }
      ::placeholder { color: ${T.textDim}; }
      .plate { font-family: ${MONO_STACK}; letter-spacing: 0.06em; text-transform: uppercase; }
      .display { font-family: ${FONT_STACK}; font-weight: 600; letter-spacing: 0.01em; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .fade-in { animation: fadeIn 0.25s ease both; }
      button { transition: opacity 0.15s ease, transform 0.1s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
      .press:active { transform: scale(0.96); }
      button:disabled { transition: none; }
      @keyframes heartPop { 0% { transform: scale(1); } 35% { transform: scale(1.35); } 60% { transform: scale(0.92); } 100% { transform: scale(1); } }
      .heart-pop { animation: heartPop 0.35s ease; }
      @keyframes sheetIn { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }
      .sheet-in { animation: sheetIn 0.3s cubic-bezier(0.32, 0.72, 0, 1) both; }
      .glass {
        background: ${T.glassBg};
        backdrop-filter: blur(22px) saturate(170%);
        -webkit-backdrop-filter: blur(22px) saturate(170%);
        border: 1px solid ${T.glassBorder};
        box-shadow: ${T.glassHighlight}, ${T.shadowRaised};
      }
      .glass-light {
        background: rgba(255,255,255,0.10);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255,255,255,0.18);
      }
    `}</style>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: T.text }}>
      <Loader2 size={28} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
      <div style={{ fontFamily: MONO_STACK, fontSize: 12, color: T.textDim, letterSpacing: "0.08em" }}>LOADING CARFOOLY</div>
    </div>
  );
}

function Onboarding({ onSubmit }) {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 16, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Car size={22} color="#fff" />
          </div>
          <div className="display" style={{ fontSize: 26, color: T.text }}>CARFOOLY</div>
        </div>
        <div style={{ color: T.textDim, fontSize: 14, marginBottom: 28 }}>Every car has a story. This is where it lives.</div>
        <div style={{ background: T.paper, borderRadius: 20, padding: 20, border: `1px solid ${T.linePaper}`, boxShadow: T.shadowRaised }}>
          <div className="plate" style={{ fontSize: 11, color: T.inkMuted, marginBottom: 8 }}>Your name</div>
          <input
            value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. George Q" maxLength={40}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 16, border: `1px solid ${T.linePaper}`, background: "#fff", color: T.ink, fontSize: 15, marginBottom: 14, outline: "none" }}
          />
          <div className="plate" style={{ fontSize: 11, color: T.inkMuted, marginBottom: 8 }}>Your handle</div>
          <input
            value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="e.g. george_q" maxLength={24}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 16, border: `1px solid ${T.linePaper}`, background: "#fff", color: T.ink, fontSize: 15, marginBottom: 14, outline: "none" }}
          />
          <p style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.5, marginBottom: 16 }}>
            This is a beta. Posts, cars, likes, and follows you add are visible to everyone else testing it — nothing private yet.
          </p>
          <button
            disabled={!handle.trim() || busy} className="press"
            onClick={async () => { setBusy(true); await onSubmit(handle, displayName); setBusy(false); }}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", background: handle.trim() ? T.accent : T.paper2, color: "#fff", fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Joining…" : "Enter Carfooly"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ username, size = 32 }) {
  const hue = hueForId(username || "?");
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, background: `hsl(${hue},50%,32%)`,
      display: "flex", alignItems: "center", justifyContent: "center", color: T.text,
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {(username || "?")[0].toUpperCase()}
    </div>
  );
}

function Shell(props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const {
    me, cars, posts, users, news, meets, communities, view, setView, selectedCarId, selectedUsername, selectedPostId, postOrigin,
    searchOrigin, setSearchOrigin, selectedMeetId, setSelectedMeetId, selectedCommunityId, openCommunity,
    carOrigin, profileTab, setProfileTab, deleteMeet,
    feedTab, setFeedTab, addCar, addMod, spotCar, toggleFollowCar, createPost, toggleLike, addComment, addReply, toggleFollow,
    toggleNewsLike, submitMeet, toggleGoing, createCommunity, toggleCommunityMembership,
    notifications, markNotificationsRead, sightings, logSighting,
    openProfile, openCar, openPost, toast,
  } = props;

  const showBack = ["car", "addCar", "newPost", "postDetail", "cars", "addMeet", "createCommunity", "inbox", "search", "communityList", "meetList", "newsList", "quickSpot", "addChoice", "communityPage"].includes(view)
    || (view === "profile" && selectedUsername !== me);
  const backTo = () => {
    if (view === "postDetail") setView(postOrigin || "feed");
    else if (view === "addCar") setView("cars");
    else if (view === "cars") setView("profile");
    else if (view === "car") setView(carOrigin || "feed");
    else if (view === "search") setView(searchOrigin || "discover");
    else if (["addMeet", "createCommunity", "communityList", "meetList", "newsList", "communityPage"].includes(view)) { setSelectedMeetId(null); setView("discover"); }
    else if (["newPost", "quickSpot"].includes(view)) setView("addChoice");
    else setView("feed");
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative", paddingBottom: 110 }}>
      <TopBar onBack={showBack ? backTo : null} />

      <div key={view} className="fade-in" style={view === "feed" ? { padding: 0 } : { padding: "0 16px" }}>
        {view === "feed" && (
          <Feed me={me} cars={cars} posts={posts} users={users} tab={feedTab} setTab={setFeedTab}
            openCar={openCar} openProfile={openProfile} openPost={openPost} toggleLike={toggleLike}
            addComment={addComment} addReply={addReply} onSheetToggle={setSheetOpen}
            openSearch={() => { setSearchOrigin("feed"); setView("search"); }} openInbox={() => setView("inbox")}
            unreadCount={(notifications[me] || []).filter((n) => !n.read).length} />
        )}
        {view === "inbox" && (
          <InboxView me={me} notifications={notifications[me] || []} posts={posts} cars={cars}
            onMount={markNotificationsRead} openPost={openPost} openCar={openCar} openProfile={openProfile} />
        )}
        {view === "discover" && (
          <DiscoverView me={me} cars={cars} users={users} news={news} meets={meets} communities={communities}
            openCar={openCar} openProfile={openProfile} openCommunity={openCommunity}
            onLikeNews={toggleNewsLike} onToggleGoing={toggleGoing}
            onToggleCommunity={toggleCommunityMembership}
            onOpenSearch={() => { setSearchOrigin("discover"); setView("search"); }} onOpenCommunities={() => setView("communityList")}
            onOpenMeets={() => setView("meetList")} onOpenNews={() => setView("newsList")} />
        )}
        {view === "search" && (
          <SearchScreen me={me} cars={cars} users={users} communities={communities}
            openCar={openCar} openProfile={openProfile} openCommunity={openCommunity} onToggleCommunity={toggleCommunityMembership} />
        )}
        {view === "communityList" && (
          <CommunitiesScreen me={me} communities={communities} onToggle={toggleCommunityMembership} onOpen={openCommunity}
            onCreate={() => setView("createCommunity")} />
        )}
        {view === "communityPage" && selectedCommunityId && communities[selectedCommunityId] && (
          <CommunityPage community={communities[selectedCommunityId]} me={me} cars={cars} posts={posts}
            onToggle={toggleCommunityMembership} openPost={openPost} openCar={openCar} />
        )}
        {view === "meetList" && (
          <MeetsScreen me={me} meets={meets} onToggleGoing={toggleGoing} onPost={() => setView("addMeet")}
            onEdit={(id) => { setSelectedMeetId(id); setView("addMeet"); }} onDelete={deleteMeet} />
        )}
        {view === "newsList" && (
          <NewsScreen me={me} news={news} onLike={toggleNewsLike} />
        )}
        {view === "addMeet" && (
          <AddMeetForm
            editing={selectedMeetId ? meets[selectedMeetId] : null}
            onSubmit={async (data) => { await submitMeet(data, selectedMeetId); setSelectedMeetId(null); }}
          />
        )}
        {view === "createCommunity" && <CreateCommunityForm onSubmit={createCommunity} />}
        {view === "cars" && (
          <CarsView cars={cars} onOpen={openCar} onAdd={() => setView("addCar")} />
        )}
        {view === "addCar" && <AddCarForm onSubmit={addCar} />}
        {view === "newPost" && (
          <NewPostForm me={me} cars={cars} communities={communities} onSubmit={createPost} onNeedCar={() => setView("addCar")} />
        )}
        {view === "addChoice" && (
          <AddChoiceScreen onNewPost={() => setView("newPost")} onSpot={() => setView("quickSpot")} />
        )}
        {view === "quickSpot" && (
          <SpotForm onSubmit={async (data) => { await logSighting(data); setView("feed"); }} />
        )}
        {view === "car" && selectedCarId && cars[selectedCarId] && (
          <CarPage car={cars[selectedCarId]} me={me} onAddMod={(n, note) => addMod(selectedCarId, n, note)}
            onSpot={() => spotCar(selectedCarId)} onFollowBuild={() => toggleFollowCar(selectedCarId)} openProfile={openProfile} />
        )}
        {view === "profile" && selectedUsername && (
          <Profile username={selectedUsername} me={me} cars={cars} posts={posts} users={users} sightings={sightings}
            tab={profileTab} setTab={setProfileTab} onSheetToggle={setSheetOpen}
            onToggleFollow={() => toggleFollow(selectedUsername)} openCar={openCar} openPost={openPost}
            onBrowseCars={() => setView("cars")} />
        )}
        {view === "postDetail" && selectedPostId && posts[selectedPostId] && (
          <PostDetail post={posts[selectedPostId]} me={me} car={cars[posts[selectedPostId].carId]}
            openCar={openCar} openProfile={openProfile} toggleLike={toggleLike} addComment={addComment} addReply={addReply} />
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", background: T.text, color: T.ink, padding: "10px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, zIndex: 50, boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      <BottomNav view={view} setView={setView} me={me} openProfile={openProfile} hidden={sheetOpen} />
    </div>
  );
}

function TopBar({ onBack }) {
  if (!onBack) return null;
  return (
    <div className="glass" style={{ position: "sticky", top: 0, zIndex: 10, padding: "12px 16px", borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <button data-nav-back onClick={onBack} className="press" style={{ background: "rgba(255,255,255,0.08)", border: "none", padding: 8, borderRadius: 999, display: "flex" }}>
        <ArrowLeft size={18} color={T.text} />
      </button>
    </div>
  );
}

function Feed({ me, cars, posts, users, tab, setTab, openCar, openProfile, openPost, toggleLike, addComment, addReply, onSheetToggle, openSearch, openInbox, unreadCount }) {
  const following = (users[me]?.following) || [];
  let list = Object.values(posts).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (tab === "following") list = list.filter((p) => following.includes(p.authorUsername));
  const [commentsPostId, setCommentsPostId] = useState(null);
  const commentsPost = commentsPostId ? posts[commentsPostId] : null;
  useEffect(() => {
    onSheetToggle && onSheetToggle(!!commentsPostId);
    return () => { onSheetToggle && onSheetToggle(false); };
  }, [commentsPostId]);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 110px)", background: T.bg, overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 8, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "14px 16px 30px",
        background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))",
        pointerEvents: "none",
      }}>
        <div className="glass-light" style={{ display: "flex", borderRadius: 999, padding: 4, pointerEvents: "auto" }}>
          {[["foryou", "For You"], ["following", "Following"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className="press" style={{
              background: tab === id ? "rgba(255,255,255,0.92)" : "none", border: "none",
              padding: "6px 14px", borderRadius: 999,
              fontSize: 12.5, fontWeight: 700, color: tab === id ? T.ink : "rgba(255,255,255,0.75)",
            }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={openSearch} className="glass-light press" style={{ position: "absolute", right: 60, top: 8, border: "none", padding: 8, borderRadius: 999, pointerEvents: "auto", display: "flex" }}>
          <Search size={18} color="#fff" />
        </button>
        <button onClick={openInbox} className="glass-light press" style={{ position: "absolute", right: 16, top: 8, border: "none", padding: 8, borderRadius: 999, pointerEvents: "auto", display: "flex" }}>
          <Bell size={18} color="#fff" />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 99,
              background: T.accent, border: `1.5px solid rgba(0,0,0,0.3)`,
            }} />
          )}
        </button>
      </div>

      {list.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <EmptyState icon={<Compass size={22} color={T.textDim} />}
            title={tab === "following" ? "No posts yet" : "Nothing here yet"}
            body={tab === "following" ? "Follow people to see their posts here." : "Be the first to post about a car."} />
        </div>
      ) : (
        <div style={{
          height: "100%", overflowY: "auto", scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch",
        }}>
          {list.map((p) => (
            <FeedSlide key={p.id} post={p} car={cars[p.carId]} me={me}
              openCar={openCar} openProfile={openProfile} toggleLike={toggleLike}
              openComments={() => setCommentsPostId(p.id)} />
          ))}
        </div>
      )}

      <BottomSheet open={!!commentsPost} onClose={() => setCommentsPostId(null)} title="Comments">
        {commentsPost && (
          <>
            {commentsPost.comments.length === 0 && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 14 }}>No comments yet.</div>}
            {commentsPost.comments.map((c) => (
              <CommentRow key={c.id} comment={c} postId={commentsPost.id} addReply={addReply} />
            ))}
            <FeedCommentInput postId={commentsPost.id} addComment={addComment} />
          </>
        )}
      </BottomSheet>
    </div>
  );
}

function FeedCommentInput({ postId, addComment }) {
  const [text, setText] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8, position: "sticky", bottom: 0, paddingTop: 8 }}>
      <div style={{ flex: 1 }}>
        <TextInput value={text} onChange={setText} placeholder="Add a comment…" maxLength={220} />
      </div>
      <button disabled={!text.trim()} className="press"
        onClick={() => { addComment(postId, text); setText(""); }}
        style={{ padding: "0 16px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 600 }}>
        Post
      </button>
    </div>
  );
}

function FeedSlide({ post, car, me, openCar, openProfile, toggleLike, openComments }) {
  const liked = post.likes.includes(me);
  const [pop, setPop] = useState(false);
  const hue = hueForId(post.id);
  const doLike = () => { toggleLike(post.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div style={{
      height: "100%", width: "100%", scrollSnapAlign: "start", scrollSnapStop: "always",
      position: "relative", display: "flex", alignItems: "flex-end",
      background: post.photoUrl ? `url(${post.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,20%), hsl(${hue},35%,10%))`,
    }}>
      {!post.photoUrl && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Car size={52} color="rgba(245,244,242,0.3)" />
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 65%)" }} />

      <button onClick={doLike} style={{
        position: "absolute", right: 12, bottom: 130, background: "none", border: "none",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3, zIndex: 3,
      }}>
        <Heart size={30} color={liked ? T.accent : "#fff"} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} />
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{post.likes.length}</span>
      </button>
      <button onClick={openComments} style={{
        position: "absolute", right: 12, bottom: 68, background: "none", border: "none",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3, zIndex: 3,
      }}>
        <MessageCircle size={28} color="#fff" />
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{post.comments.length}</span>
      </button>

      <div style={{ position: "relative", zIndex: 2, padding: "0 70px 22px 14px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button onClick={() => openProfile(post.authorUsername)} style={{ background: "none", border: "none", padding: 0, display: "flex" }}>
            <Avatar username={post.authorUsername} size={30} />
          </button>
          <button onClick={() => openProfile(post.authorUsername)} style={{ background: "none", border: "none", padding: 0, color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            {post.authorUsername}
          </button>
        </div>
        {car && (
          <button onClick={() => openCar(car.id)} style={{
            background: "rgba(230,56,70,0.9)", border: "none", borderRadius: 999, padding: "4px 10px",
            color: T.ink, fontSize: 11.5, fontWeight: 700, marginBottom: 8,
          }}>
            {car.make} {car.model} '{car.year}
          </button>
        )}
        {post.caption && (
          <div style={{
            color: "#fff", fontSize: 13.5, lineHeight: 1.4, textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {post.caption}
          </div>
        )}
      </div>
    </div>
  );
}

function notifText(n) {
  if (n.type === "like") return "liked your post";
  if (n.type === "comment") return `commented: "${n.text}"`;
  if (n.type === "reply") return `replied: "${n.text}"`;
  if (n.type === "follow") return "started following you";
  if (n.type === "spot") return "spotted your car";
  if (n.type === "followBuild") return "started following your build";
  return "";
}
function notifIcon(type) {
  if (type === "like") return <Heart size={16} color={T.accent} fill={T.accent} />;
  if (type === "comment") return <MessageCircle size={16} color={T.accent2} />;
  if (type === "reply") return <MessageCircle size={16} color={T.accent2} />;
  if (type === "follow") return <User size={16} color={T.accent} />;
  if (type === "spot") return <MapPin size={16} color={T.accent2} />;
  if (type === "followBuild") return <Car size={16} color={T.accent} />;
  return null;
}

function InboxView({ me, notifications, posts, cars, onMount, openPost, openCar, openProfile }) {
  useEffect(() => { onMount(); }, []);
  const list = [...notifications].sort((a, b) => new Date(b.date) - new Date(a.date));

  const go = (n) => {
    if ((n.type === "like" || n.type === "comment" || n.type === "reply") && posts[n.postId]) openPost(n.postId);
    else if ((n.type === "spot" || n.type === "followBuild") && cars[n.carId]) openCar(n.carId);
    else if (n.type === "follow") openProfile(n.from);
  };

  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 14 }}>Notifications</div>
      {list.length === 0 ? (
        <EmptyState icon={<Bell size={20} color={T.textDim} />} title="Nothing yet" body="Likes, comments, follows, and spots will show up here." />
      ) : (
        list.map((n) => (
          <button key={n.id} onClick={() => go(n)} style={{
            width: "100%", background: "none", border: "none", padding: "12px 0",
            display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.lineDark}`, textAlign: "left",
          }}>
            <Avatar username={n.from} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700 }}>{n.from}</span> {notifText(n)}
              </div>
              <div style={{ color: T.textDim, fontSize: 11.5, marginTop: 2 }}>{timeAgo(n.date)}</div>
            </div>
            {notifIcon(n.type)}
            {!n.read && <div style={{ width: 7, height: 7, borderRadius: 99, background: T.accent, flexShrink: 0 }} />}
          </button>
        ))
      )}
    </div>
  );
}

function PostDetail({ post, car, me, openCar, openProfile, toggleLike, addComment, addReply }) {
  const [text, setText] = useState("");
  const [pop, setPop] = useState(false);
  const liked = post.likes.includes(me);
  const hue = hueForId(post.id);
  const doLike = () => { toggleLike(post.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <button onClick={() => openProfile(post.authorUsername)} style={{ background: "none", border: "none", padding: 0 }}>
          <Avatar username={post.authorUsername} size={34} />
        </button>
        <div>
          <button onClick={() => openProfile(post.authorUsername)} style={{ background: "none", border: "none", padding: 0, color: T.text, fontSize: 14, fontWeight: 600 }}>
            {post.authorUsername}
          </button>
          {car && (
            <div>
              <button onClick={() => openCar(car.id)} style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: 12 }}>
                {car.make} {car.model} '{car.year}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{
        height: 260, borderRadius: 18, overflow: "hidden",
        background: post.photoUrl ? `url(${post.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${hue},35%,12%))`,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
      }}>
        {!post.photoUrl && <Car size={36} color="rgba(245,244,242,0.4)" />}
      </div>

      {post.caption && <div style={{ color: T.text, fontSize: 14.5, lineHeight: 1.4, marginBottom: 12 }}>{post.caption}</div>}

      <div style={{ display: "flex", gap: 16, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${T.lineDark}` }}>
        <button onClick={doLike} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
          <Heart size={18} color={liked ? T.accent : T.textDim} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} />
          <span style={{ fontSize: 13, color: T.textDim }}>{post.likes.length} likes</span>
        </button>
      </div>

      <SectionLabel>Comments</SectionLabel>
      {post.comments.length === 0 && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 14 }}>No comments yet.</div>}
      {post.comments.map((c) => (
        <CommentRow key={c.id} comment={c} postId={post.id} addReply={addReply} />
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <TextInput value={text} onChange={setText} placeholder="Add a comment…" maxLength={220} />
        </div>
        <button
          disabled={!text.trim()}
          onClick={() => { addComment(post.id, text); setText(""); }}
          style={{ padding: "0 16px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? T.ink : T.textDim, fontWeight: 600 }}
        >
          Post
        </button>
      </div>
    </div>
  );
}

function CommentRow({ comment, postId, addReply }) {
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [text, setText] = useState("");
  const replies = comment.replies || [];

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 9 }}>
        <Avatar username={comment.author} size={26} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: T.text }}>
            <span style={{ fontWeight: 600 }}>{comment.author}</span> {comment.text}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
            <span style={{ fontSize: 10.5, color: T.textDim }}>{timeAgo(comment.date)}</span>
            <button onClick={() => setReplying((r) => !r)} className="press" style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: T.textDim, fontWeight: 600 }}>
              Reply
            </button>
          </div>
        </div>
      </div>

      {replying && (
        <div className="fade-in" style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 35 }}>
          <div style={{ flex: 1 }}>
            <TextInput value={text} onChange={setText} placeholder={`Reply to ${comment.author}…`} maxLength={220} />
          </div>
          <button disabled={!text.trim()} className="press"
            onClick={() => { addReply(postId, comment.id, text); setText(""); setReplying(false); setShowReplies(true); }}
            style={{ padding: "0 14px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 600, fontSize: 12.5 }}>
            Send
          </button>
        </div>
      )}

      {replies.length > 0 && (
        <div style={{ marginLeft: 35, marginTop: 8 }}>
          <button onClick={() => setShowReplies((s) => !s)} className="press" style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 5, color: T.accent2, fontSize: 11.5, fontWeight: 600 }}>
            <div style={{ width: 20, height: 1, background: T.lineDark }} />
            {showReplies ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </button>
          {showReplies && (
            <div className="fade-in" style={{ marginTop: 10 }}>
              {replies.map((r) => (
                <div key={r.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Avatar username={r.author} size={21} />
                  <div>
                    <div style={{ fontSize: 12.5, color: T.text }}>
                      <span style={{ fontWeight: 600 }}>{r.author}</span> {r.text}
                    </div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{timeAgo(r.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiscoverView(props) {
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

function DivisionCard({ title, icon, tone, onSeeAll, children }) {
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

function SearchScreen({ me, cars, users, communities, openCar, openProfile, openCommunity, onToggleCommunity }) {
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

function CommunitiesScreen({ me, communities, onToggle, onOpen, onCreate }) {
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

function MeetsScreen({ me, meets, onToggleGoing, onPost, onEdit, onDelete }) {
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

function NewsScreen({ me, news, onLike }) {
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

function CommunityCard({ community, me, onToggle, onOpen, compact }) {
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

function CommunityPostRow({ post, car, onOpenPost, onOpenCar, onOpenProfile }) {
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

function CommunityPage({ community, me, cars, posts, onToggle, openPost, openCar }) {
  const joined = community.members.includes(me);
  const communityPosts = Object.values(posts).filter((p) => p.communityId === community.id).sort((a, b) => new Date(b.date) - new Date(a.date));

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

function CreateCommunityForm({ onSubmit }) {
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

function CarsView({ cars, onOpen, onAdd }) {
  const list = Object.values(cars).sort((a, b) => {
    const la = a.timeline[a.timeline.length - 1]?.date || a.createdAt;
    const lb = b.timeline[b.timeline.length - 1]?.date || b.createdAt;
    return new Date(lb) - new Date(la);
  });
  return (
    <div style={{ paddingTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Cars</div>
          <div style={{ fontSize: 13.5, color: T.textDim }}>Every car in the beta, with its own page</div>
        </div>
        <button onClick={onAdd} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, padding: "8px 12px", color: T.text, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
          <Plus size={14} /> Add
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Car size={22} color={T.textDim} />} title="No cars yet" body="Add the first one." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {list.map((c) => <CarCard key={c.id} car={c} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

function CarCard({ car, onOpen }) {
  const hue = hueForId(car.id);
  return (
    <button onClick={() => onOpen(car.id)} className="press" style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, overflow: "hidden", textAlign: "left", padding: 0, boxShadow: T.shadowCard }}>
      <div style={{ height: 96, background: car.photoUrl ? `url(${car.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${hue},35%,14%))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!car.photoUrl && <Car size={26} color="rgba(245,244,242,0.5)" />}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{car.make} {car.model}</div>
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginTop: 3 }}>{car.year}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11, color: T.textDim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Wrench size={11} /> {car.mods.length}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={11} /> {car.spotterUsernames.length}</span>
        </div>
      </div>
    </button>
  );
}

function SightingCard({ sighting }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 12, overflow: "hidden", boxShadow: T.shadowCard }}>
      <div style={{ height: 96, position: "relative", background: sighting.photoUrl ? `url(${sighting.photoUrl}) center/cover` : T.surface2 }}>
        <span className="plate" style={{
          position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.55)", color: T.textDim,
          fontSize: 9, padding: "3px 7px", borderRadius: 999,
        }}>
          Unverified
        </span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{sighting.make} {sighting.model}</div>
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginTop: 3 }}>{sighting.year}{sighting.trim ? ` · ${sighting.trim}` : ""}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${active ? T.accent : T.lineDark}`, background: active ? T.accent : "transparent", color: active ? T.ink : T.textDim, fontSize: 13, fontWeight: 600, boxShadow: active ? T.shadowAccent : "none" }}>
      {label}
    </button>
  );
}

function IconTab({ active, onClick, icon }) {
  return (
    <button onClick={onClick} className="press" style={{
      width: 46, height: 40, borderRadius: 999, border: `1px solid ${active ? T.accent : T.lineDark}`,
      background: active ? T.accent : T.surface, color: active ? "#fff" : T.textDim,
      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? T.shadowAccent : "none",
    }}>
      {icon}
    </button>
  );
}

function IconBadge({ children, tone = "accent", size = 40 }) {
  const bg = tone === "accent" ? "rgba(230,56,70,0.16)"
    : tone === "teal" || tone === "accent2" ? "rgba(69,123,144,0.18)"
    : tone === "warm" ? "rgba(242,184,75,0.18)"
    : "rgba(245,244,242,0.07)";
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.8, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div style={{ border: `1px solid ${T.lineDark}`, borderRadius: 22, padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)" }}>
      <IconBadge size={44}>{icon}</IconBadge>
      <div style={{ color: T.text, fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ color: T.textDim, fontSize: 13, maxWidth: 240, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

function AddCarForm({ onSubmit }) {
  const [make, setMake] = useState(""); const [model, setModel] = useState("");
  const [year, setYear] = useState(""); const [nickname, setNickname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [engine, setEngine] = useState(""); const [power, setPower] = useState("");
  const [gearbox, setGearbox] = useState(""); const [weight, setWeight] = useState(""); const [wheels, setWheels] = useState("");
  const [zeroToSixty, setZeroToSixty] = useState(""); const [topSpeed, setTopSpeed] = useState("");
  const [note, setNote] = useState(""); const [noteDetail, setNoteDetail] = useState("");
  const [showSpecs, setShowSpecs] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = make.trim() && model.trim() && year.trim();
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Add a car</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>Yours, or one you're into. It gets its own permanent page.</div>
      <Field label="Make"><TextInput value={make} onChange={setMake} placeholder="BMW" maxLength={30} /></Field>
      <Field label="Model"><TextInput value={model} onChange={setModel} placeholder="M4" maxLength={40} /></Field>
      <Field label="Year"><TextInput value={year} onChange={setYear} placeholder="2024" maxLength={4} /></Field>
      <Field label="Build nickname (optional)"><TextInput value={nickname} onChange={setNickname} placeholder="e.g. Coilover Miata" maxLength={40} /></Field>
      <Field label="Photo URL (optional)"><TextInput value={photoUrl} onChange={setPhotoUrl} placeholder="https://…" icon={<ImageIcon size={14} />} /></Field>

      <button onClick={() => setShowSpecs((s) => !s)} className="press" style={{
        background: "none", border: "none", color: T.accent, fontSize: 12.5, fontWeight: 600, padding: "4px 0 14px",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {showSpecs ? "Hide" : "Add"} spec details <ChevronRight size={13} style={{ transform: showSpecs ? "rotate(90deg)" : "none", transition: "transform .15s ease" }} />
      </button>
      {showSpecs && (
        <div className="fade-in">
          <Field label="Engine"><TextInput value={engine} onChange={setEngine} placeholder="1.8 BP-ZE" maxLength={40} /></Field>
          <Field label="Power"><TextInput value={power} onChange={setPower} placeholder="131 hp" maxLength={20} /></Field>
          <Field label="Gearbox"><TextInput value={gearbox} onChange={setGearbox} placeholder="5-spd manual" maxLength={30} /></Field>
          <Field label="Weight"><TextInput value={weight} onChange={setWeight} placeholder="990 kg" maxLength={20} /></Field>
          <Field label="Wheels"><TextInput value={wheels} onChange={setWheels} placeholder="15x8 Watanabe" maxLength={40} /></Field>
          <Field label="0-60"><TextInput value={zeroToSixty} onChange={setZeroToSixty} placeholder="7.2s" maxLength={15} /></Field>
          <Field label="Top Speed"><TextInput value={topSpeed} onChange={setTopSpeed} placeholder="120 mph" maxLength={20} /></Field>
        </div>
      )}

      <Field label="First build log entry (optional)"><TextInput value={note} onChange={setNote} placeholder="e.g. Stage 2 tune" maxLength={60} /></Field>
      {note.trim() && <Field label="Details (optional)"><TextInput value={noteDetail} onChange={setNoteDetail} placeholder="Notes, part numbers…" maxLength={150} /></Field>}

      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ make, model, year, nickname, photoUrl, engine, power, gearbox, weight, wheels, zeroToSixty, topSpeed, note, noteDetail }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: valid ? T.accent : T.surface2, color: valid ? T.ink : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Adding…" : "Add to Carfooly"}
      </button>
    </div>
  );
}

function NewPostForm({ me, cars, communities, onSubmit, onNeedCar }) {
  const carList = Object.values(cars).sort((a, b) => a.make.localeCompare(b.make));
  const joinedCommunities = Object.values(communities || {}).filter((c) => c.members.includes(me));
  const [carId, setCarId] = useState(carList[0]?.id || "");
  const [communityId, setCommunityId] = useState("");
  const [photo, setPhoto] = useState(null); const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  if (carList.length === 0) {
    return (
      <div style={{ paddingTop: 18 }}>
        <EmptyState icon={<Car size={22} color={T.textDim} />} title="No cars to post about yet" body="Add a car first, then you can post updates and photos of it." />
        <button onClick={onNeedCar} style={{ width: "100%", marginTop: 14, padding: "13px 16px", borderRadius: 16, border: "none", background: T.accent, color: T.ink, fontWeight: 600, fontSize: 15 }}>
          Add a car
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>New post</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>Shows up in the feed and stays on the car's page for good.</div>

      <Field label="Which car">
        <select value={carId} onChange={(e) => setCarId(e.target.value)}
          style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }}>
          {carList.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model} '{c.year}</option>)}
        </select>
      </Field>
      {joinedCommunities.length > 0 && (
        <Field label="Post to a community (optional)">
          <select value={communityId} onChange={(e) => setCommunityId(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }}>
            <option value="">None</option>
            {joinedCommunities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Photo (optional)">
        {photo ? (
          <div>
            <PhotoEditor photo={photo} onChange={setPhoto} />
            <button onClick={() => setPhoto(null)} className="press" style={{ marginTop: 8, background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, padding: 0 }}>
              Remove photo
            </button>
          </div>
        ) : (
          <CameraCapture value={null} onChange={(src) => setPhoto({ src, filter: "none", stickers: [] })} allowLibrary />
        )}
      </Field>
      <Field label="Caption"><TextInput value={caption} onChange={setCaption} placeholder="What's going on with it?" maxLength={280} /></Field>

      <button disabled={busy}
        onClick={async () => {
          setBusy(true);
          const baked = photo ? await bakePhoto(photo) : null;
          await onSubmit({ carId, photoUrl: baked || "", caption, communityId });
          setBusy(false);
        }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: T.accent, color: T.ink, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Posting…" : "Post"}

      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, icon, autoFocus, maxLength }) {
  return (
    <div style={{ position: "relative" }}>
      {icon && <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textDim }}>{icon}</div>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength}
        style={{ width: "100%", padding: icon ? "11px 14px 11px 34px" : "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }} />
    </div>
  );
}

function CarPage({ car, me, onAddMod, onSpot, onFollowBuild, openProfile }) {
  const [modName, setModName] = useState(""); const [modNote, setModNote] = useState(""); const [addingMod, setAddingMod] = useState(false);
  const isOwner = car.ownerUsername === me;
  const alreadySpotted = car.spotterUsernames.includes(me);
  const following = (car.followerUsernames || []).includes(me);
  const hue = hueForId(car.id);
  const timeline = [...car.timeline].sort((a, b) => new Date(b.date) - new Date(a.date));
  const specs = [
    ["Engine", car.engine], ["Power", car.power],
    ["Gearbox", car.gearbox], ["Weight", car.weight],
    ["Wheels", car.wheels], ["0-60", car.zeroToSixty],
    ["Top Speed", car.topSpeed], ["Owned since", fmtDate(car.createdAt)],
  ].filter(([, v]) => v);

  return (
    <div style={{ paddingBottom: 10 }} className="fade-in">
      <div style={{ height: "38vh", minHeight: 280, margin: "0 -16px 0", background: car.photoUrl ? `url(${car.photoUrl}) center/cover` : `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${hue},35%,12%))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!car.photoUrl && <Car size={64} color="rgba(245,244,242,0.4)" />}
      </div>

      <div style={{ background: T.paper, margin: "-14px 0 0", borderRadius: "26px 26px 0 0", padding: "18px 16px 20px", position: "relative", zIndex: 2, boxShadow: "0 -4px 16px rgba(0,0,0,0.25)" }}>
        <div className="plate" style={{ fontSize: 11, color: T.inkMuted, marginBottom: 3 }}>{car.year} · {car.make} {car.model}</div>
        <div className="display" style={{ fontSize: 23, color: T.ink, marginBottom: 12 }}>{car.nickname || `${car.make} ${car.model}`}</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button onClick={() => openProfile(car.ownerUsername)} style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar username={car.ownerUsername} size={26} />
            <span style={{ color: T.inkMuted, fontSize: 12.5 }}>Kept by <span style={{ color: T.accent, fontWeight: 700 }}>{car.ownerUsername}</span></span>
          </button>
          {!isOwner && (
            <button onClick={onFollowBuild} className="press" style={{
              padding: "7px 13px", borderRadius: 999, border: `1px solid ${following ? T.linePaper : T.accent}`,
              background: following ? "transparent" : T.accent, color: following ? T.inkMuted : T.ink,
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
            }}>
              {following && <Check size={11} />} {following ? "Following" : "Follow build"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.linePaper}` }}>
          <Stat label="Mods" value={car.mods.length} />
          <Stat label="Spots" value={car.spotterUsernames.length} />
          <Stat label="Followers" value={(car.followerUsernames || []).length} />
        </div>

        {!isOwner && (
          <button onClick={onSpot} disabled={alreadySpotted} className="press"
            style={{ width: "100%", marginTop: 16, padding: "12px 16px", borderRadius: 16, border: "none", background: alreadySpotted ? T.paper2 : T.accent2, color: alreadySpotted ? T.inkMuted : "#fff", fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <MapPin size={15} />{alreadySpotted ? "You spotted this" : "I spotted this"}
          </button>
        )}
      </div>

      <div style={{ padding: "20px 4px 0" }}>
        {specs.length > 0 && (
          <>
            <SectionLabel>Spec</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {specs.map(([label, val]) => (
                <div key={label} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, padding: "10px 12px", boxShadow: T.shadowCard }}>
                  <div className="plate" style={{ fontSize: 9.5, color: T.textDim, marginBottom: 3 }}>{label}</div>
                  <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <SectionLabel>Build log · {car.mods.length} {car.mods.length === 1 ? "entry" : "entries"}</SectionLabel>
        <div style={{ position: "relative", paddingLeft: 18, marginBottom: isOwner ? 14 : 4 }}>
          <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 1, background: T.lineDark }} />
          {timeline.map((t) => (
            <div key={t.id} style={{ position: "relative", marginBottom: 18 }}>
              <div style={{ position: "absolute", left: -18, top: 3, width: 9, height: 9, borderRadius: 99, background: t.type === "spot" ? T.accent2 : t.type === "mod" || t.type === "post" ? T.accent : T.textDim, border: `2px solid ${T.bg}` }} />
              <div className="plate" style={{ color: T.textDim, fontSize: 10.5, marginBottom: 2 }}>{fmtDate(t.date)}</div>
              <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.4 }}>
                <button onClick={() => openProfile(t.by)} style={{ background: "none", border: "none", padding: 0, color: T.text, fontWeight: 600, fontSize: 13.5 }}>{t.by}</button>
                {" "}{verbPhrase(t)}
              </div>
              {t.type === "mod" && t.modNote && (
                <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 3, lineHeight: 1.4 }}>{t.modNote}</div>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1 }}><TextInput value={modName} onChange={setModName} placeholder="e.g. Ohlins DFV coilovers" maxLength={60} /></div>
              <button disabled={!modName.trim() || addingMod} className="press"
                onClick={async () => { setAddingMod(true); await onAddMod(modName, modNote); setModName(""); setModNote(""); setAddingMod(false); }}
                style={{ padding: "0 16px", borderRadius: 16, border: "none", background: modName.trim() ? T.accent : T.surface2, color: modName.trim() ? T.ink : T.textDim, fontWeight: 600 }}>
                <Plus size={16} />
              </button>
            </div>
            <TextInput value={modNote} onChange={setModNote} placeholder="Details (optional) — ride height, part numbers, notes" maxLength={200} />
          </div>
        )}

        {car.spotterUsernames.length > 0 && (
          <div style={{ color: T.textDim, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <MapPin size={12} /> Spotted {car.spotterUsernames.length} {car.spotterUsernames.length === 1 ? "time" : "times"}
          </div>
        )}
      </div>
    </div>
  );
}

function Profile({ username, me, cars, posts, users, sightings, tab, setTab, onSheetToggle, onToggleFollow, openCar, openPost, onBrowseCars }) {
  const [showBadges, setShowBadges] = useState(false);
  useEffect(() => {
    onSheetToggle && onSheetToggle(showBadges);
    return () => { onSheetToggle && onSheetToggle(false); };
  }, [showBadges]);
  const user = users[username] || { name: username, joinedAt: null, followers: [], following: [] };
  const isMe = username === me;
  const iFollow = (users[me]?.following || []).includes(username);

  const myPosts = Object.values(posts).filter((p) => p.authorUsername === username).sort((a, b) => new Date(b.date) - new Date(a.date));
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
        </div>
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
              Browse every car <ExternalLink size={14} color={T.textDim} />
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

function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <>
      <div data-sheet-backdrop onClick={onClose} className="fade-in" style={{
        position: "fixed", inset: 0, zIndex: 40, background: "rgba(6,6,7,0.78)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }} />
      <div className="glass sheet-in" style={{
        position: "fixed", left: "50%", bottom: 0, transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, maxHeight: "48vh", zIndex: 41,
        borderRadius: "26px 26px 0 0", padding: "10px 20px calc(24px + env(safe-area-inset-bottom))",
        overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.25)", margin: "4px auto 16px" }} />
        {title && <div className="display" style={{ fontSize: 18, color: T.text, marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </>
  );
}

function Stat({ label, value, small, dark }) {
  return (
    <div>
      <div style={{ color: dark ? T.text : T.ink, fontSize: small ? 13 : 17, fontWeight: 700 }}>{value}</div>
      <div className="plate" style={{ fontSize: 9.5, color: dark ? T.textDim : T.inkMuted, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ color: T.text, fontSize: 12.5, fontWeight: 700 }}>{value}</span>
      <span style={{ color: T.textDim, fontSize: 11 }}>{label}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="plate" style={{ fontSize: 11, color: T.textDim, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 14, height: 1, background: T.lineDark }} />{children}
    </div>
  );
}

function NewsCard({ item, me, onLike, compact }) {
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

const MEET_ROLES = [
  { id: "organizer", label: "Organizing" },
  { id: "driver", label: "Driving" },
  { id: "attendee", label: "Attending" },
];

function MeetCard({ meet, me, onToggleGoing, onEdit, onDelete }) {
  const attendees = meet.attendees || [];
  const myRole = attendees.find((a) => a.username === me)?.role;
  const isMine = meet.submittedBy === me;
  return (
    <div style={{ marginBottom: 12, padding: 14, borderRadius: 20, background: T.surface, border: `1px solid ${T.lineDark}`, boxShadow: T.shadowCard }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 600, flex: 1 }}>{meet.title}</div>
        {isMine && onEdit && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => onEdit(meet.id)} className="press" style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pencil size={12} color={T.textDim} />
            </button>
            <button onClick={() => onDelete(meet.id)} className="press" style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} color={T.accent} />
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: T.accent2, display: "flex", alignItems: "center", gap: 5 }}><Clock size={12} /> {fmtWhen(meet.when)}</span>
        <span style={{ fontSize: 12.5, color: T.textDim, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={12} /> {meet.location}</span>
      </div>
      {meet.note && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 10, lineHeight: 1.4 }}>{meet.note}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        {MEET_ROLES.map((r) => {
          const count = attendees.filter((a) => a.role === r.id).length;
          const mine = myRole === r.id;
          return (
            <button key={r.id} onClick={() => onToggleGoing(meet.id, r.id)} className="press" style={{
              flex: 1, padding: "8px 6px", borderRadius: 16, border: `1px solid ${mine ? T.accent : T.lineDark}`,
              background: mine ? "rgba(230,56,70,0.14)" : "transparent", color: mine ? T.accent : T.textDim,
              fontSize: 11.5, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddMeetForm({ onSubmit, editing }) {
  const [title, setTitle] = useState(editing?.title || ""); const [location, setLocation] = useState(editing?.location || "");
  const [when, setWhen] = useState(editing?.when || ""); const [note, setNote] = useState(editing?.note || ""); const [busy, setBusy] = useState(false);
  const valid = title.trim() && location.trim() && when;
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>{editing ? "Edit meet" : "Post a meet"}</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>{editing ? "Update the details." : "Let people know where and when."}</div>
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="e.g. Friday night cars & coffee" maxLength={60} /></Field>
      <Field label="Location"><TextInput value={location} onChange={setLocation} placeholder="Where's it happening?" maxLength={80} /></Field>
      <Field label="When">
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
          style={{ width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }} />
      </Field>
      <Field label="Note (optional)"><TextInput value={note} onChange={setNote} placeholder="Anything people should know" maxLength={200} /></Field>
      <button disabled={!valid || busy}
        onClick={async () => { setBusy(true); await onSubmit({ title, location, when, note }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 8, background: valid ? T.accent : T.surface2, color: valid ? T.ink : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? (editing ? "Saving…" : "Posting…") : (editing ? "Save changes" : "Post meet")}
      </button>
    </div>
  );
}

function AddChoiceScreen({ onNewPost, onSpot }) {
  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Add to Carfooly</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>What do you want to do?</div>

      <button onClick={onNewPost} className="press" style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 18, marginBottom: 12,
        background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`,
        borderRadius: 20, boxShadow: T.shadowCard, textAlign: "left",
      }}>
        <IconBadge size={48} tone="accent"><ImageIcon size={22} color={T.accent} /></IconBadge>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>Post</div>
          <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.4 }}>Share a photo, update, or build progress on one of your cars.</div>
        </div>
        <ChevronRight size={18} color={T.textDim} />
      </button>

      <button onClick={onSpot} className="press" style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 18,
        background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`,
        borderRadius: 20, boxShadow: T.shadowCard, textAlign: "left",
      }}>
        <IconBadge size={48} tone="accent2"><MapPin size={22} color={T.accent2} /></IconBadge>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>Spot</div>
          <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.4 }}>Log a car you found in the wild, with a photo.</div>
        </div>
        <ChevronRight size={18} color={T.textDim} />
      </button>
    </div>
  );
}

function CameraCapture({ value, onChange, allowLibrary }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onChange(canvas.toDataURL("image/jpeg", 0.6));
        setBusy(false);
      };
      img.onerror = () => setBusy(false);
      img.src = e.target.result;
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" {...(allowLibrary ? {} : { capture: "environment" })} style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />
      {value ? (
        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden" }}>
          <img src={value} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          <button onClick={() => inputRef.current.click()} className="glass press" style={{
            position: "absolute", bottom: 10, right: 10, border: "none", padding: "8px 12px", borderRadius: 999,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Camera size={14} color="#fff" /><span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Retake</span>
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} disabled={busy} className="press" style={{
          width: "100%", height: 170, borderRadius: 18, border: `1.5px dashed ${T.lineDark}`, background: T.surface,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <IconBadge size={42}><Camera size={19} color={T.accent} /></IconBadge>
          <span style={{ color: T.textDim, fontSize: 12.5, fontWeight: 600 }}>{busy ? "Processing…" : "Take a photo"}</span>
        </button>
      )}
    </div>
  );
}

const PHOTO_FILTERS = [
  { id: "none", label: "None", css: "" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.05)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.1)" },
  { id: "warm", label: "Warm", css: "sepia(0.3) saturate(1.2) brightness(1.03)" },
  { id: "cool", label: "Cool", css: "hue-rotate(-8deg) saturate(1.1) brightness(1.02) contrast(1.05)" },
  { id: "fade", label: "Fade", css: "contrast(0.85) brightness(1.08) saturate(0.85)" },
];

function PhotoEditor({ photo, onChange }) {
  const [filter, setFilter] = useState(photo.filter || "none");
  const [stickers, setStickers] = useState(photo.stickers || []);
  const imgRef = useRef(null);
  const dragState = useRef(null);

  const filterCss = PHOTO_FILTERS.find((f) => f.id === filter)?.css || "";

  const addSticker = () => {
    const s = { id: uid("st"), x: 30, y: 40, w: 26, h: 12 };
    const next = [...stickers, s];
    setStickers(next);
    onChange({ ...photo, filter, stickers: next });
  };
  const removeSticker = (id) => {
    const next = stickers.filter((s) => s.id !== id);
    setStickers(next);
    onChange({ ...photo, filter, stickers: next });
  };

  const onPointerDownDrag = (e, id, mode) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    dragState.current = { id, mode, rect, startX: e.clientX, startY: e.clientY };
    window.addEventListener("pointermove", onPointerMoveDrag);
    window.addEventListener("pointerup", onPointerUpDrag);
  };
  const onPointerMoveDrag = (e) => {
    const d = dragState.current;
    if (!d) return;
    const dxPct = ((e.clientX - d.startX) / d.rect.width) * 100;
    const dyPct = ((e.clientY - d.startY) / d.rect.height) * 100;
    setStickers((prev) => prev.map((s) => {
      if (s.id !== d.id) return s;
      if (d.mode === "move") {
        return { ...s, x: Math.max(0, Math.min(100 - s.w, s.x + dxPct)), y: Math.max(0, Math.min(100 - s.h, s.y + dyPct)) };
      }
      return { ...s, w: Math.max(8, Math.min(100 - s.x, s.w + dxPct)), h: Math.max(6, Math.min(100 - s.y, s.h + dyPct)) };
    }));
    d.startX = e.clientX; d.startY = e.clientY;
  };
  const onPointerUpDrag = () => {
    window.removeEventListener("pointermove", onPointerMoveDrag);
    window.removeEventListener("pointerup", onPointerUpDrag);
    dragState.current = null;
    setStickers((current) => { onChange({ ...photo, filter, stickers: current }); return current; });
  };

  return (
    <div>
      <div ref={imgRef} style={{ position: "relative", borderRadius: 18, overflow: "hidden", touchAction: "none" }}>
        <img src={photo.src} alt="" style={{ width: "100%", height: 220, objectFit: "cover", display: "block", filter: filterCss }} />
        {stickers.map((s) => (
          <div key={s.id} onPointerDown={(e) => onPointerDownDrag(e, s.id, "move")} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`,
            background: "rgba(10,10,11,0.92)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab",
          }}>
            <span className="plate" style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>PLATE</span>
            <button onClick={() => removeSticker(s.id)} style={{
              position: "absolute", top: -8, right: -8, width: 18, height: 18, borderRadius: 999, background: T.accent,
              border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}>
              <Plus size={11} color="#fff" style={{ transform: "rotate(45deg)" }} />
            </button>
            <div onPointerDown={(e) => onPointerDownDrag(e, s.id, "resize")} style={{
              position: "absolute", right: -4, bottom: -4, width: 16, height: 16, borderRadius: 999,
              background: "#fff", border: `2px solid ${T.accent}`, cursor: "nwse-resize",
            }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12, paddingBottom: 2 }}>
        {PHOTO_FILTERS.map((f) => (
          <button key={f.id} onClick={() => { setFilter(f.id); onChange({ ...photo, filter: f.id, stickers }); }} className="press" style={{
            flexShrink: 0, padding: "7px 13px", borderRadius: 999, border: `1px solid ${filter === f.id ? T.accent : T.lineDark}`,
            background: filter === f.id ? "rgba(230,56,70,0.14)" : T.surface, color: filter === f.id ? T.accent : T.textDim,
            fontSize: 12, fontWeight: 600,
          }}>
            {f.label}
          </button>
        ))}
      </div>

      <button onClick={addSticker} className="press" style={{
        width: "100%", marginTop: 10, padding: "9px 12px", borderRadius: 14, border: `1px solid ${T.lineDark}`,
        background: T.surface, color: T.text, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <Plus size={13} /> Cover a plate
      </button>
      {stickers.length > 0 && <div style={{ fontSize: 11, color: T.textDim, marginTop: 6, textAlign: "center" }}>Drag to move, corner handle to resize</div>}
    </div>
  );
}

async function bakePhoto(photo) {
  if (!photo) return null;
  const filterCss = PHOTO_FILTERS.find((f) => f.id === photo.filter)?.css || "";
  const stickers = photo.stickers || [];
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.filter = filterCss || "none";
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      stickers.forEach((s) => {
        const x = (s.x / 100) * img.width, y = (s.y / 100) * img.height;
        const w = (s.w / 100) * img.width, h = (s.h / 100) * img.height;
        ctx.fillStyle = "rgba(10,10,11,0.96)";
        const r = Math.min(10, w / 4, h / 4);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
      });
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(photo.src);
    img.src = photo.src;
  });
}

function SpotForm({ onSubmit }) {
  const [photo, setPhoto] = useState(null);
  const [make, setMake] = useState(""); const [model, setModel] = useState("");
  const [year, setYear] = useState(""); const [trim, setTrim] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = photo && make.trim() && model.trim() && year.trim();

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Log a spot</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 20 }}>What did you find? A photo helps others recognize it.</div>

      <div style={{ marginBottom: 16 }}><CameraCapture value={photo} onChange={setPhoto} /></div>

      <Field label="Make"><TextInput value={make} onChange={setMake} placeholder="Nissan" maxLength={30} /></Field>
      <Field label="Model"><TextInput value={model} onChange={setModel} placeholder="Skyline GT-R" maxLength={40} /></Field>
      <Field label="Year"><TextInput value={year} onChange={setYear} placeholder="1999" maxLength={4} /></Field>
      <Field label="Trim (optional)"><TextInput value={trim} onChange={setTrim} placeholder="V-Spec" maxLength={30} /></Field>

      <div style={{ fontSize: 11.5, color: T.textDim, lineHeight: 1.5, marginBottom: 14 }}>
        Spots are marked unverified until we can confirm the photo matches — that needs a backend we haven't built yet.
      </div>

      <button disabled={!valid || busy} className="press"
        onClick={async () => { setBusy(true); await onSubmit({ make, model, year, trim, photoUrl: photo }); setBusy(false); }}
        style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", background: valid ? T.accent : T.surface2, color: valid ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
        {busy ? "Logging…" : "Log spot"}
      </button>
    </div>
  );
}

function BottomNav({ view, setView, me, openProfile, hidden }) {
  const items = [
    { id: "feed", label: "Feed", icon: Car, match: ["feed"] },
    { id: "discover", label: "Discover", icon: Compass, match: ["discover", "addMeet", "createCommunity", "search", "communityList", "meetList", "newsList", "communityPage"] },
    { id: "__add", label: "Add", icon: Plus, match: ["addChoice", "newPost", "quickSpot"] },
    { id: "__profile", label: "Profile", icon: User, match: ["profile", "cars", "addCar"] },
  ];
  return (
    <div className="glass" style={{
      position: "fixed", bottom: "calc(16px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 32px)", maxWidth: 400, display: "flex", borderRadius: 999,
      padding: "8px 10px", zIndex: 20, gap: 2,
      opacity: hidden ? 0 : 1, pointerEvents: hidden ? "none" : "auto", transition: "opacity 0.2s ease",
    }}>
      {items.map(({ id, icon: Icon, match }) => {
        const active = match.includes(view);
        return (
          <button key={id}
            onClick={() => id === "__profile" ? openProfile(me) : id === "__add" ? setView("addChoice") : setView(id)}
            className="press"
            style={{ flex: 1, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
            <div style={{
              width: 44, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
              background: active ? T.accent : "transparent", boxShadow: active ? T.shadowAccent : "none", transition: "background 0.15s ease",
            }}>
              <Icon size={20} color={active ? "#fff" : T.textDim} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
