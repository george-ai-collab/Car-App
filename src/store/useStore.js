import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "../lib/utils";
import { SEED_NEWS } from "../lib/seedNews";

// All app data lives here. Screens call these actions; actions only change data
// (they never move between pages — the Shell decides where to go next).
// window.storage is the one place that will be swapped for Supabase later.

export const KEYS = {
  cars: "carfooly-cars",
  posts: "carfooly-posts",
  users: "carfooly-users",
  news: "carfooly-news",
  meets: "carfooly-meets",
  communities: "carfooly-communities",
  notifications: "carfooly-notifications",
  sightings: "carfooly-sightings",
  discussions: "carfooly-discussions",
  reports: "carfooly-reports",
  me: "carfooly-me",
};

const readShared = (key) => window.storage.get(key, true).then((r) => (r ? JSON.parse(r.value) : null)).catch(() => null);

function normalizeMeets(raw) {
  const out = {};
  Object.values(raw || {}).forEach((meet) => {
    if (Array.isArray(meet.attendees)) out[meet.id] = meet;
    else if (Array.isArray(meet.goingUsernames)) out[meet.id] = { ...meet, attendees: meet.goingUsernames.map((u) => ({ username: u, role: "attendee" })) };
    else out[meet.id] = { ...meet, attendees: [] };
  });
  return out;
}

export function useStore(flash) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    cars: {}, posts: {}, users: {}, news: {}, meets: {}, communities: {}, notifications: {}, sightings: {}, discussions: {},
  });
  // Private to the signed-in person: posts they hid ("not interested") and people they blocked.
  const [prefs, setPrefs] = useState({ hidden: [], blocked: [] });
  const prefsKey = (h) => `carfooly-prefs:${h}`;
  useEffect(() => {
    if (!me) return;
    window.storage.get(prefsKey(me), false).then((r) => setPrefs(r ? { hidden: [], blocked: [], ...JSON.parse(r.value) } : { hidden: [], blocked: [] })).catch(() => {});
  }, [me]);
  const savePrefs = async (next) => {
    setPrefs(next);
    try { await window.storage.set(prefsKey(me), JSON.stringify(next), false); } catch { /* not critical */ }
  };

  // Always-fresh copy of data, so actions that change several things in a row don't overwrite each other.
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    (async () => {
      const [c, p, u, n, m, co, nf, sg, ds, meRes] = await Promise.all([
        readShared(KEYS.cars), readShared(KEYS.posts), readShared(KEYS.users), readShared(KEYS.news),
        readShared(KEYS.meets), readShared(KEYS.communities), readShared(KEYS.notifications), readShared(KEYS.sightings), readShared(KEYS.discussions),
        window.storage.get(KEYS.me, false).catch(() => null),
      ]);
      const seed = {};
      SEED_NEWS.forEach((item) => { seed[item.id] = { ...item, submittedBy: null, likes: [] }; });
      const next = {
        cars: c || {}, posts: p || {}, users: u || {}, news: { ...seed, ...(n || {}) },
        meets: normalizeMeets(m), communities: co || {}, notifications: nf || {}, sightings: sg || {}, discussions: ds || {},
      };
      ref.current = next;
      setData(next);
      setMe(meRes ? meRes.value : null);
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (name, value, quiet) => {
    ref.current = { ...ref.current, [name]: value };
    setData(ref.current);
    try { await window.storage.set(KEYS[name], JSON.stringify(value), true); }
    catch { if (!quiet) flash("Couldn't save. Try again."); }
  }, [flash]);

  const get = () => ref.current;
  const now = () => new Date().toISOString();

  // Notifications skip your own actions on purpose (same as Instagram/TikTok).
  // Repeat actions (follow, unfollow, follow again) replace the old notification instead of piling up.
  const sameEvent = (a, b) => a.type === b.type && a.from === b.from && (a.carId || null) === (b.carId || null)
    && (a.type === "like" ? a.postId === b.postId : true);
  const DEDUPE = ["follow", "followBuild", "like"];
  const pushNotif = async (to, notif) => {
    if (!to || to === me) return;
    const all = get().notifications;
    const full = { from: me, ...notif };
    const rest = (all[to] || []).filter((n) => !(DEDUPE.includes(full.type) && sameEvent(n, full)));
    await save("notifications", { ...all, [to]: [{ id: uid("n"), date: now(), read: false, ...full }, ...rest] }, true);
  };
  // Un-doing something (unfollow, unlike) quietly removes its notification.
  const dropNotif = async (to, notif) => {
    if (!to || to === me) return;
    const all = get().notifications;
    const full = { from: me, ...notif };
    if (!(all[to] || []).some((n) => sameEvent(n, full))) return;
    await save("notifications", { ...all, [to]: all[to].filter((n) => !sameEvent(n, full)) }, true);
  };

  // ---------- account ----------
  // Handles are always lowercase, so "George_Q" and "george_q" can never be two different people.
  const claimUsername = async (handle, displayName) => {
    const clean = handle.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_.]{2,24}$/.test(clean)) { flash("Handles use 2–24 letters, numbers, _ or ."); return; }
    try {
      await window.storage.set(KEYS.me, clean, false);
      const users = get().users;
      const existing = users[clean];
      await save("users", {
        ...users,
        [clean]: existing
          ? { ...existing, name: displayName.trim() || existing.name || clean }
          : { name: displayName.trim() || clean, joinedAt: now(), followers: [], following: [] },
      });
      setMe(clean);
    } catch { flash("Couldn't save your name. Try again."); }
  };

  const updateProfile = async ({ name, bio, avatar }) => {
    const users = get().users;
    const rec = users[me] || { joinedAt: now(), followers: [], following: [] };
    await save("users", { ...users, [me]: { ...rec, name: name.trim() || me, bio: (bio || "").trim(), avatar: avatar || null } });
    flash("Profile updated");
  };

  const logout = async () => {
    try { await window.storage.delete(KEYS.me, false); } catch { /* ignore */ }
    setMe(null);
  };

  // Removes everything this account made, then logs out.
  const deleteAccount = async () => {
    const d = get();
    const myCarIds = new Set(Object.values(d.cars).filter((c) => c.ownerUsername === me).map((c) => c.id));
    const strip = (list) => (list || []).filter((u) => u !== me);

    const cars = {};
    Object.values(d.cars).forEach((c) => {
      if (myCarIds.has(c.id)) return;
      cars[c.id] = { ...c, spotterUsernames: strip(c.spotterUsernames), followerUsernames: strip(c.followerUsernames), timeline: c.timeline.filter((t) => t.by !== me) };
    });
    const posts = {};
    Object.values(d.posts).forEach((p) => {
      if (p.authorUsername === me) return;
      posts[p.id] = {
        ...p,
        carId: myCarIds.has(p.carId) ? null : p.carId,
        likes: strip(p.likes),
        comments: p.comments.filter((c) => c.author !== me).map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r.author !== me) })),
      };
    });
    const users = {};
    Object.entries(d.users).forEach(([h, u]) => {
      if (h === me) return;
      users[h] = { ...u, followers: strip(u.followers), following: strip(u.following) };
    });
    const meets = {};
    Object.values(d.meets).forEach((m) => {
      if (m.submittedBy === me) return;
      meets[m.id] = { ...m, attendees: m.attendees.filter((a) => a.username !== me) };
    });
    const communities = {};
    Object.values(d.communities).forEach((c) => { communities[c.id] = { ...c, members: strip(c.members) }; });
    const sightings = {};
    Object.values(d.sightings).forEach((s) => { if (s.spotterUsername !== me) sightings[s.id] = s; });
    const notifications = {};
    Object.entries(d.notifications).forEach(([h, list]) => { if (h !== me) notifications[h] = list.filter((n) => n.from !== me); });
    const news = {};
    Object.values(d.news).forEach((n) => { news[n.id] = { ...n, likes: strip(n.likes) }; });
    const discussions = {};
    Object.values(d.discussions).forEach((t) => {
      if (t.author === me) return;
      discussions[t.id] = { ...t, likes: strip(t.likes), replies: t.replies.filter((r) => r.author !== me) };
    });

    await save("cars", cars); await save("posts", posts); await save("users", users); await save("meets", meets);
    await save("communities", communities); await save("sightings", sightings); await save("notifications", notifications, true);
    await save("news", news); await save("discussions", discussions);
    await logout();
  };

  // ---------- cars ----------
  const addCar = async (f) => {
    const id = uid("car");
    const t = now();
    const timeline = [{ id: uid("t"), type: "created", by: me, date: t }];
    const mods = [];
    if (f.note.trim()) {
      mods.push({ id: uid("m"), name: f.note.trim(), note: f.noteDetail.trim(), date: t });
      timeline.push({ id: uid("t"), type: "mod", by: me, date: t, modName: f.note.trim(), modNote: f.noteDetail.trim() });
    }
    const car = {
      id, make: f.make.trim(), model: f.model.trim(), year: f.year.trim(), nickname: f.nickname.trim(),
      engine: f.engine.trim(), power: f.power.trim(), gearbox: f.gearbox.trim(), weight: f.weight.trim(), wheels: f.wheels.trim(),
      zeroToSixty: f.zeroToSixty.trim(), topSpeed: f.topSpeed.trim(),
      ownerUsername: me, photoUrl: (f.photoUrl || "").trim() || null, createdAt: t,
      hasPage: !!f.hasPage, // public car page is opt-in
      mods, timeline, spotterUsernames: [], followerUsernames: [],
    };
    await save("cars", { ...get().cars, [id]: car });

    // Every new make gets its own brand community, and the owner joins it.
    const brand = f.make.trim();
    const communities = get().communities;
    const existing = Object.values(communities).find((c) => c.name.trim().toLowerCase() === brand.toLowerCase()); // one community per name
    if (existing) {
      if (!existing.members.includes(me)) await save("communities", { ...communities, [existing.id]: { ...existing, members: [...existing.members, me] } });
    } else if (brand) {
      const cid = uid("community");
      await save("communities", { ...communities, [cid]: { id: cid, name: brand, description: `Everything ${brand}.`, kind: "brand", createdBy: null, members: [me], createdAt: t } });
    }
    flash("Car added");
    return id;
  };

  const editCar = async (carId, f) => {
    const car = get().cars[carId];
    if (!car || car.ownerUsername !== me) return;
    const fields = ["make", "model", "year", "nickname", "engine", "power", "gearbox", "weight", "wheels", "zeroToSixty", "topSpeed"];
    const updated = { ...car };
    fields.forEach((k) => { if (typeof f[k] === "string") updated[k] = f[k].trim(); });
    if (typeof f.photoUrl === "string") updated.photoUrl = f.photoUrl.trim() || null;
    if (typeof f.hasPage === "boolean") updated.hasPage = f.hasPage;
    await save("cars", { ...get().cars, [carId]: updated });
    flash("Car updated");
  };

  // Deleting a car keeps posts about it, but they lose the car tag.
  const deleteCar = async (carId) => {
    const d = get();
    const car = d.cars[carId];
    if (!car || car.ownerUsername !== me) return;
    const { [carId]: _gone, ...cars } = d.cars;
    const posts = {};
    Object.values(d.posts).forEach((p) => { posts[p.id] = p.carId === carId ? { ...p, carId: null } : p; });
    const sightings = {};
    Object.values(d.sightings).forEach((s) => { sightings[s.id] = s.matchedCarId === carId ? { ...s, matchedCarId: null } : s; });
    await save("cars", cars);
    await save("posts", posts);
    await save("sightings", sightings);
    flash("Car deleted");
  };

  const addMod = async (carId, name, note) => {
    const car = get().cars[carId];
    if (!car || !name.trim()) return;
    const t = now();
    const updated = {
      ...car,
      mods: [...car.mods, { id: uid("m"), name: name.trim(), note: (note || "").trim(), date: t }],
      timeline: [...car.timeline, { id: uid("t"), type: "mod", by: me, date: t, modName: name.trim(), modNote: (note || "").trim() }],
    };
    await save("cars", { ...get().cars, [carId]: updated });
    flash("Build updated");
  };

  const toggleFollowCar = async (carId) => {
    const car = get().cars[carId];
    if (!car || car.ownerUsername === me) return;
    const fans = car.followerUsernames || [];
    const following = fans.includes(me);
    await save("cars", { ...get().cars, [carId]: { ...car, followerUsernames: following ? fans.filter((u) => u !== me) : [...fans, me] } });
    if (!following) await pushNotif(car.ownerUsername, { type: "followBuild", from: me, carId });
    else await dropNotif(car.ownerUsername, { type: "followBuild", carId });
  };

  const spotCar = async (carId) => {
    const car = get().cars[carId];
    if (!car || car.spotterUsernames.includes(me) || car.ownerUsername === me) return;
    const updated = {
      ...car,
      spotterUsernames: [...car.spotterUsernames, me],
      timeline: [...car.timeline, { id: uid("t"), type: "spot", by: me, date: now() }],
    };
    await save("cars", { ...get().cars, [carId]: updated });
    await pushNotif(car.ownerUsername, { type: "spot", from: me, carId });
    flash("Logged. Nice find.");
  };

  const logSighting = async ({ make, model, year, trim, photoUrl }) => {
    const id = uid("sighting");
    const t = now();
    const cars = get().cars;
    const matched = Object.values(cars).find((c) => c.hasPage !== false &&
      c.make.toLowerCase() === make.trim().toLowerCase() &&
      c.model.toLowerCase() === model.trim().toLowerCase() &&
      c.year.trim() === year.trim());
    await save("sightings", {
      ...get().sightings,
      [id]: { id, spotterUsername: me, make: make.trim(), model: model.trim(), year: year.trim(), trim: trim.trim(), photoUrl, verified: false, matchedCarId: matched ? matched.id : null, date: t },
    });
    if (matched && matched.ownerUsername !== me && !matched.spotterUsernames.includes(me)) {
      await save("cars", {
        ...get().cars,
        [matched.id]: { ...matched, spotterUsernames: [...matched.spotterUsernames, me], timeline: [...matched.timeline, { id: uid("t"), type: "spot", by: me, date: t }] },
      });
      await pushNotif(matched.ownerUsername, { type: "spot", from: me, carId: matched.id });
    }
    flash(matched ? "Logged. Matched to an existing car." : "Logged. Nice find.");
  };

  // ---------- posts ----------
  // A post: up to 10 photos, an optional car tag, location, tagged people and community.
  const createPost = async ({ carId, carLabel, photos = [], photoUrl, photoAspect, caption, communityId, location, tags = [] }) => {
    const car = carId ? get().cars[carId] : null;
    const pics = photos.length ? photos.slice(0, 10) : photoUrl ? [{ url: photoUrl, aspect: photoAspect || null }] : [];
    if (!pics.length && !caption.trim()) return null;
    const id = uid("post");
    const t = now();
    const tagged = [...new Set(tags)].filter((h) => h !== me && get().users[h]).slice(0, 10);
    await save("posts", {
      ...get().posts,
      [id]: {
        id, carId: car ? carId : null, carLabel: car ? "" : (carLabel || "").trim().slice(0, 50), authorUsername: me,
        photos: pics, photoUrl: pics[0]?.url || null, photoAspect: pics[0]?.aspect || null,
        caption: caption.trim(), date: t, likes: [], comments: [], communityId: communityId || null,
        location: location && location.label ? { label: location.label, city: location.city || "", lat: location.lat ?? null, lng: location.lng ?? null } : null,
        tags: tagged,
      },
    });
    if (car) {
      let updatedCar = { ...car, timeline: [...car.timeline, { id: uid("t"), type: "post", by: me, date: t, detail: caption.trim(), postId: id }] };
      if (car.ownerUsername !== me && !car.spotterUsernames.includes(me)) {
        updatedCar = { ...updatedCar, spotterUsernames: [...updatedCar.spotterUsernames, me], timeline: [...updatedCar.timeline, { id: uid("t"), type: "spot", by: me, date: t }] };
      }
      await save("cars", { ...get().cars, [carId]: updatedCar });
    }
    for (const h of tagged) await pushNotif(h, { type: "tag", from: me, postId: id });
    flash("Posted");
    return id;
  };

  const editPost = async (postId, caption) => {
    const post = get().posts[postId];
    if (!post || post.authorUsername !== me) return;
    await save("posts", { ...get().posts, [postId]: { ...post, caption: caption.trim(), editedAt: now() } });
    flash("Caption updated");
  };

  // Archived posts are hidden from everyone but can be brought back from Settings.
  const setArchived = async (postId, archived) => {
    const post = get().posts[postId];
    if (!post || post.authorUsername !== me) return;
    await save("posts", { ...get().posts, [postId]: { ...post, archived } });
    flash(archived ? "Post archived" : "Post restored");
  };

  const deletePost = async (postId) => {
    const d = get();
    const post = d.posts[postId];
    if (!post || post.authorUsername !== me) return;
    const { [postId]: _gone, ...posts } = d.posts;
    await save("posts", posts);
    const car = post.carId && d.cars[post.carId];
    if (car) {
      // Old posts don't store postId on the timeline, so fall back to matching date + author.
      const timeline = car.timeline.filter((t) => !(t.type === "post" && (t.postId === postId || (!t.postId && t.by === me && t.date === post.date))));
      await save("cars", { ...d.cars, [car.id]: { ...car, timeline } });
    }
    const notifications = {};
    Object.entries(get().notifications).forEach(([h, list]) => { notifications[h] = list.filter((n) => n.postId !== postId); });
    await save("notifications", notifications, true);
    flash("Post deleted");
  };

  const toggleLike = async (postId) => {
    const post = get().posts[postId];
    if (!post) return;
    const has = post.likes.includes(me);
    await save("posts", { ...get().posts, [postId]: { ...post, likes: has ? post.likes.filter((u) => u !== me) : [...post.likes, me] } });
    if (!has) await pushNotif(post.authorUsername, { type: "like", from: me, postId });
    else await dropNotif(post.authorUsername, { type: "like", postId });
  };

  const addComment = async (postId, text) => {
    const post = get().posts[postId];
    if (!post || !text.trim()) return;
    await save("posts", { ...get().posts, [postId]: { ...post, comments: [...post.comments, { id: uid("c"), author: me, text: text.trim(), date: now(), replies: [] }] } });
    await pushNotif(post.authorUsername, { type: "comment", from: me, postId, text: text.trim().slice(0, 60) });
  };

  const addReply = async (postId, commentId, text) => {
    const post = get().posts[postId];
    if (!post || !text.trim()) return;
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) return;
    const reply = { id: uid("r"), author: me, text: text.trim(), date: now() };
    await save("posts", { ...get().posts, [postId]: { ...post, comments: post.comments.map((c) => (c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c)) } });
    await pushNotif(comment.author, { type: "reply", from: me, postId, text: text.trim().slice(0, 60) });
  };

  // ---------- people ----------
  const toggleFollow = async (target) => {
    if (target === me) return;
    const users = get().users;
    const blank = { joinedAt: now(), followers: [], following: [] };
    const meRec = users[me] || blank;
    const themRec = users[target] || blank;
    const isFollowing = meRec.following.includes(target);
    await save("users", {
      ...users,
      [me]: { ...meRec, following: isFollowing ? meRec.following.filter((u) => u !== target) : [...meRec.following, target] },
      [target]: { ...themRec, followers: isFollowing ? themRec.followers.filter((u) => u !== me) : [...themRec.followers, me] },
    });
    if (!isFollowing) await pushNotif(target, { type: "follow", from: me });
    else await dropNotif(target, { type: "follow" });
  };

  // ---------- news / meets / communities ----------
  const toggleNewsLike = async (id) => {
    const item = get().news[id];
    if (!item) return;
    const has = item.likes.includes(me);
    await save("news", { ...get().news, [id]: { ...item, likes: has ? item.likes.filter((u) => u !== me) : [...item.likes, me] } });
  };

  const capNum = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : null; };
  // A meet: what, when, where (with city/country for Near you), cover photo, sponsors, details.
  const submitMeet = async (f, editingId) => {
    if (!f.title.trim() || !f.location.trim() || !f.when) return null;
    const fields = {
      title: f.title.trim(), location: f.location.trim(), lat: f.lat ?? null, lng: f.lng ?? null,
      city: (f.city || "").trim(), country: (f.country || "").trim(),
      when: f.when, note: (f.note || "").trim(), cover: f.cover || null,
      sponsors: (f.sponsors || []).map((x) => x.trim()).filter(Boolean).slice(0, 8),
      caps: { driver: capNum(f.caps?.driver), attendee: capNum(f.caps?.attendee) },
    };
    const meets = get().meets;
    if (editingId) {
      const existing = meets[editingId];
      if (!existing || existing.submittedBy !== me) return null;
      await save("meets", { ...meets, [editingId]: { ...existing, ...fields } });
      flash("Meet updated");
      return editingId;
    }
    const id = uid("meet");
    await save("meets", { ...meets, [id]: { id, ...fields, submittedBy: me, createdAt: now(), attendees: [{ username: me, role: "organizer" }] } });
    flash("Meet posted");
    return id;
  };

  const deleteMeet = async (id) => {
    const meets = get().meets;
    if (!meets[id] || meets[id].submittedBy !== me) return;
    const { [id]: _gone, ...rest } = meets;
    await save("meets", rest);
    flash("Meet removed");
  };

  // RSVP. Only organizers can make someone an organizer; Driving/Attending can have a cap.
  const isOrganizer = (meet, u) => meet.submittedBy === u || meet.attendees.some((a) => a.username === u && a.role === "organizer");
  const toggleGoing = async (id, role) => {
    const item = get().meets[id];
    if (!item) return;
    if (role === "organizer" && !isOrganizer(item, me)) return;
    const existing = item.attendees.find((a) => a.username === me);
    if (existing && existing.role === role) {
      if (item.submittedBy === me && role === "organizer") return; // the creator always stays on the organizing list
      await save("meets", { ...get().meets, [id]: { ...item, attendees: item.attendees.filter((a) => a.username !== me) } });
      return;
    }
    const cap = item.caps?.[role];
    if (cap && item.attendees.filter((a) => a.role === role).length >= cap) { flash(`${role === "driver" ? "Driving" : "Attending"} is full`); return; }
    const attendees = existing
      ? item.attendees.map((a) => (a.username === me ? { ...a, role } : a))
      : [...item.attendees, { username: me, role }];
    await save("meets", { ...get().meets, [id]: { ...item, attendees } });
  };

  // Organizer tools: move someone to another list, or take them off.
  const setMeetRole = async (meetId, username, role) => {
    const item = get().meets[meetId];
    if (!item || !isOrganizer(item, me) || username === item.submittedBy) return;
    const attendees = role
      ? item.attendees.map((a) => (a.username === username ? { ...a, role } : a))
      : item.attendees.filter((a) => a.username !== username);
    await save("meets", { ...get().meets, [meetId]: { ...item, attendees } });
  };
  const setMeetCaps = async (meetId, caps) => {
    const item = get().meets[meetId];
    if (!item || !isOrganizer(item, me)) return;
    const clean = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : null; };
    await save("meets", { ...get().meets, [meetId]: { ...item, caps: { driver: clean(caps.driver), attendee: clean(caps.attendee) } } });
    flash("Limits saved");
  };

  const nameTaken = (name, exceptId) => Object.values(get().communities).some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase());

  const createCommunity = async ({ name, description }) => {
    if (!name.trim()) return null;
    if (nameTaken(name)) { flash("A community with that name already exists"); return null; }
    const id = uid("community");
    await save("communities", { ...get().communities, [id]: { id, name: name.trim(), description: description.trim(), kind: "custom", createdBy: me, members: [me], createdAt: now() } });
    flash("Community created");
    return id;
  };

  const editCommunity = async (id, { name, description }) => {
    const c = get().communities[id];
    if (!c || c.createdBy !== me || !name.trim()) return false;
    if (nameTaken(name, id)) { flash("A community with that name already exists"); return false; }
    await save("communities", { ...get().communities, [id]: { ...c, name: name.trim(), description: (description || "").trim() } });
    flash("Community updated");
    return true;
  };

  // Deleting a community keeps the posts (they just leave the community) and removes its discussions.
  const deleteCommunity = async (id) => {
    const d = get();
    const c = d.communities[id];
    if (!c || c.createdBy !== me) return;
    const { [id]: _gone, ...communities } = d.communities;
    const posts = {};
    Object.values(d.posts).forEach((p) => { posts[p.id] = p.communityId === id ? { ...p, communityId: null } : p; });
    const discussions = {};
    Object.values(d.discussions).forEach((t) => { if (t.communityId !== id) discussions[t.id] = t; });
    await save("communities", communities); await save("posts", posts); await save("discussions", discussions);
    flash("Community deleted");
  };

  const toggleCommunityMembership = async (id) => {
    const c = get().communities[id];
    if (!c) return;
    const inIt = c.members.includes(me);
    await save("communities", { ...get().communities, [id]: { ...c, members: inIt ? c.members.filter((u) => u !== me) : [...c.members, me] } });
  };

  // ---------- community discussions ----------
  const joinIfNeeded = async (communityId) => {
    const c = get().communities[communityId];
    if (c && !c.members.includes(me)) await save("communities", { ...get().communities, [c.id]: { ...c, members: [...c.members, me] } });
  };

  const createThread = async ({ communityId, title, body }) => {
    if (!title.trim() || !get().communities[communityId]) return null;
    const id = uid("thread");
    await save("discussions", { ...get().discussions, [id]: { id, communityId, author: me, title: title.trim(), body: (body || "").trim(), date: now(), likes: [], replies: [] } });
    await joinIfNeeded(communityId);
    flash("Discussion started");
    return id;
  };

  const replyThread = async (threadId, text) => {
    const t = get().discussions[threadId];
    if (!t || !text.trim()) return;
    const reply = { id: uid("r"), author: me, text: text.trim(), date: now() };
    await save("discussions", { ...get().discussions, [threadId]: { ...t, replies: [...t.replies, reply] } });
    await joinIfNeeded(t.communityId);
    await pushNotif(t.author, { type: "threadReply", from: me, threadId, text: text.trim().slice(0, 60) });
  };

  const toggleThreadLike = async (threadId) => {
    const t = get().discussions[threadId];
    if (!t) return;
    const has = t.likes.includes(me);
    await save("discussions", { ...get().discussions, [threadId]: { ...t, likes: has ? t.likes.filter((u) => u !== me) : [...t.likes, me] } });
  };

  const deleteThread = async (threadId) => {
    const t = get().discussions[threadId];
    if (!t || t.author !== me) return;
    const { [threadId]: _gone, ...rest } = get().discussions;
    await save("discussions", rest);
    flash("Discussion deleted");
  };

  const editThread = async (threadId, { title, body }) => {
    const t = get().discussions[threadId];
    if (!t || t.author !== me || !title.trim()) return;
    await save("discussions", { ...get().discussions, [threadId]: { ...t, title: title.trim(), body: (body || "").trim(), editedAt: now() } });
    flash("Discussion updated");
  };
  const deleteThreadReply = async (threadId, replyId) => {
    const t = get().discussions[threadId];
    if (!t) return;
    await save("discussions", { ...get().discussions, [threadId]: { ...t, replies: t.replies.filter((r) => !(r.id === replyId && r.author === me)) } });
  };
  const deleteComment = async (postId, commentId, replyId) => {
    const p = get().posts[postId];
    if (!p) return;
    const comments = replyId
      ? p.comments.map((c) => (c.id === commentId ? { ...c, replies: (c.replies || []).filter((r) => !(r.id === replyId && r.author === me)) } : c))
      : p.comments.filter((c) => !(c.id === commentId && c.author === me));
    await save("posts", { ...get().posts, [postId]: { ...p, comments } });
  };

  // ---------- safety: report, not interested, block ----------
  const report = async ({ kind, id, reason, note }) => {
    const rid = uid("report");
    const all = (await readShared(KEYS.reports)) || {};
    const next = { ...all, [rid]: { id: rid, kind, targetId: id, reason, note: (note || "").trim(), by: me, date: now(), status: "open" } };
    try { await window.storage.set(KEYS.reports, JSON.stringify(next), true); } catch { /* ignore */ }
    flash("Thanks. We'll take a look.");
  };
  const hidePost = async (postId) => {
    if (prefs.hidden.includes(postId)) return;
    await savePrefs({ ...prefs, hidden: [...prefs.hidden, postId] });
    flash("Got it. You'll see fewer posts like this.");
  };
  const undoHide = async (postId) => savePrefs({ ...prefs, hidden: prefs.hidden.filter((x) => x !== postId) });
  const toggleBlock = async (handle) => {
    if (!handle || handle === me) return;
    const blocked = prefs.blocked.includes(handle);
    await savePrefs({ ...prefs, blocked: blocked ? prefs.blocked.filter((x) => x !== handle) : [...prefs.blocked, handle] });
    if (!blocked) {
      // Blocking also unfollows both ways.
      const users = get().users;
      const mine = users[me], theirs = users[handle];
      if (mine && theirs) {
        await save("users", {
          ...users,
          [me]: { ...mine, following: mine.following.filter((u) => u !== handle), followers: mine.followers.filter((u) => u !== handle) },
          [handle]: { ...theirs, following: theirs.following.filter((u) => u !== me), followers: theirs.followers.filter((u) => u !== me) },
        });
      }
    }
    flash(blocked ? `Unblocked @${handle}` : `Blocked @${handle}`);
  };

  const markNotificationsRead = async () => {
    const all = get().notifications;
    const mine = all[me] || [];
    if (mine.every((n) => n.read)) return;
    await save("notifications", { ...all, [me]: mine.map((n) => ({ ...n, read: true })) }, true);
  };

  return {
    me, loading, flash, prefs, ...data,
    actions: {
      claimUsername, updateProfile, logout, deleteAccount,
      addCar, editCar, deleteCar, addMod, toggleFollowCar, spotCar, logSighting,
      createPost, editPost, setArchived, deletePost, toggleLike, addComment, addReply,
      toggleFollow, toggleNewsLike, submitMeet, deleteMeet, toggleGoing,
      createCommunity, toggleCommunityMembership, markNotificationsRead,
      createThread, replyThread, toggleThreadLike, deleteThread, editThread, deleteThreadReply, deleteComment,
      setMeetRole, setMeetCaps, editCommunity, deleteCommunity,
      report, hidePost, undoHide, toggleBlock,
    },
  };
}
