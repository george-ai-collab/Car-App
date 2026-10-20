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
    cars: {}, posts: {}, users: {}, news: {}, meets: {}, communities: {}, notifications: {}, sightings: {},
  });
  // Always-fresh copy of data, so actions that change several things in a row don't overwrite each other.
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    (async () => {
      const [c, p, u, n, m, co, nf, sg, meRes] = await Promise.all([
        readShared(KEYS.cars), readShared(KEYS.posts), readShared(KEYS.users), readShared(KEYS.news),
        readShared(KEYS.meets), readShared(KEYS.communities), readShared(KEYS.notifications), readShared(KEYS.sightings),
        window.storage.get(KEYS.me, false).catch(() => null),
      ]);
      const seed = {};
      SEED_NEWS.forEach((item) => { seed[item.id] = { ...item, submittedBy: null, likes: [] }; });
      const next = {
        cars: c || {}, posts: p || {}, users: u || {}, news: { ...seed, ...(n || {}) },
        meets: normalizeMeets(m), communities: co || {}, notifications: nf || {}, sightings: sg || {},
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
  const claimUsername = async (handle, displayName) => {
    const clean = handle.trim().replace(/^@/, "");
    if (!clean) return;
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

    await save("cars", cars); await save("posts", posts); await save("users", users); await save("meets", meets);
    await save("communities", communities); await save("sightings", sightings); await save("notifications", notifications, true);
    await save("news", news);
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
    const existing = Object.values(communities).find((c) => c.kind === "brand" && c.name.toLowerCase() === brand.toLowerCase());
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
  const createPost = async ({ carId, photoUrl, photoAspect, caption, communityId }) => {
    const car = get().cars[carId];
    if (!car) return;
    const id = uid("post");
    const t = now();
    await save("posts", {
      ...get().posts,
      [id]: { id, carId, authorUsername: me, photoUrl: (photoUrl || "").trim() || null, photoAspect: photoAspect || null, caption: caption.trim(), date: t, likes: [], comments: [], communityId: communityId || null },
    });
    let updatedCar = { ...car, timeline: [...car.timeline, { id: uid("t"), type: "post", by: me, date: t, detail: caption.trim(), postId: id }] };
    if (car.ownerUsername !== me && !car.spotterUsernames.includes(me)) {
      updatedCar = { ...updatedCar, spotterUsernames: [...updatedCar.spotterUsernames, me], timeline: [...updatedCar.timeline, { id: uid("t"), type: "spot", by: me, date: t }] };
    }
    await save("cars", { ...get().cars, [carId]: updatedCar });
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

  const submitMeet = async ({ title, location, lat, lng, when, note }, editingId) => {
    if (!title.trim() || !location.trim() || !when) return null;
    const place = { location: location.trim(), lat: lat ?? null, lng: lng ?? null };
    const meets = get().meets;
    if (editingId) {
      const existing = meets[editingId];
      if (!existing || existing.submittedBy !== me) return null;
      await save("meets", { ...meets, [editingId]: { ...existing, title: title.trim(), ...place, when, note: note.trim() } });
      flash("Meet updated");
      return editingId;
    }
    const id = uid("meet");
    await save("meets", { ...meets, [id]: { id, title: title.trim(), ...place, when, note: note.trim(), submittedBy: me, createdAt: now(), attendees: [{ username: me, role: "organizer" }] } });
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

  const toggleGoing = async (id, role) => {
    const item = get().meets[id];
    if (!item) return;
    const existing = item.attendees.find((a) => a.username === me);
    let attendees;
    if (existing && existing.role === role) attendees = item.attendees.filter((a) => a.username !== me);
    else if (existing) attendees = item.attendees.map((a) => (a.username === me ? { ...a, role } : a));
    else attendees = [...item.attendees, { username: me, role }];
    await save("meets", { ...get().meets, [id]: { ...item, attendees } });
  };

  const createCommunity = async ({ name, description }) => {
    if (!name.trim()) return null;
    const id = uid("community");
    await save("communities", { ...get().communities, [id]: { id, name: name.trim(), description: description.trim(), kind: "custom", createdBy: me, members: [me], createdAt: now() } });
    flash("Community created");
    return id;
  };

  const toggleCommunityMembership = async (id) => {
    const c = get().communities[id];
    if (!c) return;
    const inIt = c.members.includes(me);
    await save("communities", { ...get().communities, [id]: { ...c, members: inIt ? c.members.filter((u) => u !== me) : [...c.members, me] } });
  };

  const markNotificationsRead = async () => {
    const all = get().notifications;
    const mine = all[me] || [];
    if (mine.every((n) => n.read)) return;
    await save("notifications", { ...all, [me]: mine.map((n) => ({ ...n, read: true })) }, true);
  };

  return {
    me, loading, flash, ...data,
    actions: {
      claimUsername, updateProfile, logout, deleteAccount,
      addCar, editCar, deleteCar, addMod, toggleFollowCar, spotCar, logSighting,
      createPost, editPost, setArchived, deletePost, toggleLike, addComment, addReply,
      toggleFollow, toggleNewsLike, submitMeet, deleteMeet, toggleGoing,
      createCommunity, toggleCommunityMembership, markNotificationsRead,
    },
  };
}
