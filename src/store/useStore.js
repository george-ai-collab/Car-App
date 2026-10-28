import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "../lib/utils";
import { SEED_NEWS } from "../lib/seedNews";
import { REMOTE, REFRESH_MS } from "../backend/config";
import * as remote from "../backend/remote";

// All app data lives here. Screens call these actions; actions only change data
// (they never move between pages — the Shell decides where to go next).
// Online (REMOTE): every change shows instantly on this phone, then saves to the
// backend in the background, in order. Every ~20s the app reloads to pick up
// other people's changes. Offline/test builds (local) keep everything on the device.

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
    if (!me || REMOTE) return;
    window.storage.get(prefsKey(me), false).then((r) => setPrefs(r ? { hidden: [], blocked: [], ...JSON.parse(r.value) } : { hidden: [], blocked: [] })).catch(() => {});
  }, [me]);
  const savePrefs = async (next) => {
    setPrefs(next);
    if (REMOTE) return;
    try { await window.storage.set(prefsKey(me), JSON.stringify(next), false); } catch { /* not critical */ }
  };

  // Always-fresh copy of data, so actions that change several things in a row don't overwrite each other.
  const ref = useRef(data);
  ref.current = data;

  // ---------- online sync ----------
  const meId = useRef(null);          // your account id (online only)
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const version = useRef(0);          // goes up with every change made on this phone
  const newId = (prefix) => (REMOTE ? crypto.randomUUID() : uid(prefix));
  const idOf = (handle) => ref.current.users[handle]?.id || null;
  const CACHE = "carfooly-cache";

  const apply = (res) => {
    ref.current = res.data;
    setData(res.data);
    setPrefs(res.prefs);
    setMe(res.me);
  };
  // Reload everything from the backend. Skipped if you changed something meanwhile
  // (your change is still on its way, and the next reload will include it).
  const refresh = useCallback(async () => {
    if (!REMOTE || !meId.current || pending.current) return;
    const started = version.current;
    try {
      const res = await remote.load(meId.current);
      if (version.current !== started || pending.current || !meId.current) return;
      if (!res.me) { meId.current = null; setMe(null); return; }
      apply(res);
      window.storage.set(CACHE, JSON.stringify({ userId: meId.current, ...res }), false).catch(() => {});
    } catch { /* offline: keep showing what we have */ }
  }, []);

  // Run a backend save after the ones before it. If it fails, say so and reload the truth.
  const sync = (fn) => {
    if (!REMOTE || !meId.current) return;
    pending.current += 1;
    const id = meId.current;
    queue.current = queue.current
      .then(() => fn(id))
      .catch((e) => { flash(remote.writeMessage(e)); })
      .finally(() => { pending.current -= 1; if (!pending.current) { version.current += 1; refresh(); } });
  };

  const startSession = async (userId) => {
    meId.current = userId;
    const res = await remote.load(userId);
    if (!res.me) throw new Error("no profile");
    apply(res);
    window.storage.set(CACHE, JSON.stringify({ userId, ...res }), false).catch(() => {});
  };

  useEffect(() => {
    if (!REMOTE) return;
    (async () => {
      try {
        const userId = await remote.currentUserId();
        if (userId) {
          meId.current = userId;
          // Show the last saved copy straight away (also works offline), then fetch fresh.
          const cached = await window.storage.get(CACHE, false).catch(() => null);
          const c = cached ? JSON.parse(cached.value) : null;
          if (c && c.userId === userId && c.me) { apply(c); setLoading(false); }
          try { await startSession(userId); }
          catch (e) { if (!c || c.userId !== userId) { if (e?.message === "no profile") await remote.signOut(); meId.current = null; } }
        }
      } catch { /* not signed in */ }
      setLoading(false);
    })();
  }, []);

  // Pick up other people's changes while the app is open.
  useEffect(() => {
    if (!REMOTE || !me) return;
    const tick = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [me, refresh]);

  useEffect(() => {
    if (REMOTE) return;
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
    version.current += 1;
    if (REMOTE) return;
    try { await window.storage.set(KEYS[name], JSON.stringify(value), true); }
    catch { if (!quiet) flash("Couldn't save. Try again."); }
  }, [flash]);

  const get = () => ref.current;
  const now = () => new Date().toISOString();

  // Notifications skip your own actions on purpose (same as Instagram/TikTok).
  // Repeat actions (follow, unfollow, follow again) replace the old notification instead of piling up.
  const sameEvent = (a, b) => a.type === b.type && a.from === b.from && (a.carId || null) === (b.carId || null)
    && (a.type === "like" ? a.postId === b.postId : true) && (a.type === "commentLike" ? a.commentId === b.commentId : true);
  const DEDUPE = ["follow", "followBuild", "like", "commentLike"];
  const pushNotif = async (to, notif) => {
    if (!to || to === me || REMOTE) return;
    const all = get().notifications;
    const full = { from: me, ...notif };
    const rest = (all[to] || []).filter((n) => !(DEDUPE.includes(full.type) && sameEvent(n, full)));
    await save("notifications", { ...all, [to]: [{ id: newId("n"), date: now(), read: false, ...full }, ...rest] }, true);
  };
  // Un-doing something (unfollow, unlike) quietly removes its notification.
  const dropNotif = async (to, notif) => {
    if (!to || to === me || REMOTE) return;
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
      if (!existing) await markNewAccount(clean);
      await save("users", {
        ...users,
        [clean]: existing
          ? { ...existing, name: displayName.trim() || existing.name || clean }
          : { name: displayName.trim() || clean, joinedAt: now(), followers: [], following: [] },
      });
      setMe(clean);
    } catch { flash("Couldn't save your name. Try again."); }
  };

  // Online accounts: email + password. The handle is reserved by the database.
  const resetToSignedOut = () => {
    meId.current = null;
    const empty = { cars: {}, posts: {}, users: {}, news: {}, meets: {}, communities: {}, notifications: {}, sightings: {}, discussions: {} };
    ref.current = empty;
    setData(empty);
    setPrefs({ hidden: [], blocked: [] });
    window.storage.delete(CACHE, false).catch(() => {});
    setMe(null);
  };
  const checkHandle = (handle) => remote.handleAvailable(handle);
  const signUp = async (f) => {
    const res = await remote.signUp(f);
    if (!res.error) await markNewAccount(f.handle);
    if (res.error || res.needsConfirm) return res;
    try { await startSession(res.userId); return {}; } catch { return { error: "Account made, but it couldn't load. Try logging in." }; }
  };
  const signIn = async (f) => {
    const res = await remote.signIn(f);
    if (res.error) return res;
    try { await startSession(res.userId); return {}; } catch { await remote.signOut(); meId.current = null; return { error: "Couldn't load your account. Check your connection and try again." }; }
  };
  const resetPassword = (email) => remote.resetPassword(email);
  const confirmReset = async (f) => {
    const res = await remote.confirmReset(f);
    if (res.error) {
      if (res.userId) await remote.signOut(); // code worked but the new password didn't: start again
      return { error: res.error };
    }
    try { await startSession(res.userId); return {}; } catch { return { error: "Password changed. Log in with your new password." }; }
  };
  // New accounts get a short "make it yours" setup once (remembered on this phone).
  const setupKey = (h) => `carfooly-setup:${h}`;
  const markNewAccount = (h) => window.storage.set(setupKey(h), "pending", false).catch(() => {});

  const updateProfile = async ({ name, bio, avatar, accountType }, quiet) => {
    const users = get().users;
    const rec = users[me] || { joinedAt: now(), followers: [], following: [] };
    const type = ["personal", "club", "business"].includes(accountType) ? accountType : rec.accountType || "personal";
    const next = { ...rec, name: (name ?? rec.name ?? "").trim() || me, bio: (bio ?? rec.bio ?? "").trim(), avatar: avatar === undefined ? rec.avatar || null : avatar || null, accountType: type };
    await save("users", { ...users, [me]: next });
    sync((id) => remote.write.profile(id, { name: next.name.slice(0, 40), bio: next.bio.slice(0, 150), avatar: next.avatar, accountType: type }));
    if (!quiet) flash("Profile updated");
  };

  const logout = async () => {
    if (REMOTE) { await queue.current; await remote.signOut(); resetToSignedOut(); return; }
    try { await window.storage.delete(KEYS.me, false); } catch { /* ignore */ }
    setMe(null);
  };

  // Removes everything this account made, then logs out.
  const deleteAccount = async () => {
    if (REMOTE) {
      await queue.current;
      try { await remote.deleteAccount(meId.current); resetToSignedOut(); }
      catch { flash("Couldn't delete your account. Check your connection and try again."); }
      return;
    }
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
    const id = newId("car");
    const t = now();
    const timeline = [{ id: newId("t"), type: "created", by: me, date: t }];
    const mods = [];
    if (f.note.trim()) {
      mods.push({ id: newId("m"), name: f.note.trim(), note: f.noteDetail.trim(), date: t });
      timeline.push({ id: newId("t"), type: "mod", by: me, date: t, modName: f.note.trim(), modNote: f.noteDetail.trim() });
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
    sync((me2) => remote.write.addCar(me2, car, f.make.trim()));

    // Every new make gets its own brand community, and the owner joins it.
    const brand = f.make.trim();
    const communities = get().communities;
    const existing = Object.values(communities).find((c) => c.name.trim().toLowerCase() === brand.toLowerCase()); // one community per name
    if (existing) {
      if (!existing.members.includes(me)) await save("communities", { ...communities, [existing.id]: { ...existing, members: [...existing.members, me] } });
    } else if (brand) {
      const cid = newId("community");
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
    sync((id) => remote.write.editCar(id, updated));
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
    sync((id) => remote.write.deleteCar(id, carId));
    flash("Car deleted");
  };

  const addMod = async (carId, name, note) => {
    const car = get().cars[carId];
    if (!car || !name.trim()) return;
    const t = now();
    const mod = { id: newId("m"), name: name.trim().slice(0, 60), note: (note || "").trim().slice(0, 200), date: t };
    const event = { id: newId("t"), type: "mod", by: me, date: t, modName: mod.name, modNote: mod.note };
    const updated = { ...car, mods: [...car.mods, mod], timeline: [...car.timeline, event] };
    await save("cars", { ...get().cars, [carId]: updated });
    sync((id) => remote.write.addMod(id, carId, mod, event));
    flash("Build updated");
  };

  const toggleFollowCar = async (carId) => {
    const car = get().cars[carId];
    if (!car || car.ownerUsername === me) return;
    const fans = car.followerUsernames || [];
    const following = fans.includes(me);
    await save("cars", { ...get().cars, [carId]: { ...car, followerUsernames: following ? fans.filter((u) => u !== me) : [...fans, me] } });
    sync((id) => remote.write.followCar(id, carId, !following));
    if (!following) await pushNotif(car.ownerUsername, { type: "followBuild", from: me, carId });
    else await dropNotif(car.ownerUsername, { type: "followBuild", carId });
  };

  const spotCar = async (carId) => {
    const car = get().cars[carId];
    if (!car || car.spotterUsernames.includes(me) || car.ownerUsername === me) return;
    const event = { id: newId("t"), type: "spot", by: me, date: now() };
    const updated = { ...car, spotterUsernames: [...car.spotterUsernames, me], timeline: [...car.timeline, event] };
    await save("cars", { ...get().cars, [carId]: updated });
    sync((id) => remote.write.spot(id, carId, event));
    await pushNotif(car.ownerUsername, { type: "spot", from: me, carId });
    flash("Logged. Nice find.");
  };

  const logSighting = async ({ make, model, year, trim, photoUrl }) => {
    const id = newId("sighting");
    const t = now();
    const cars = get().cars;
    const matched = Object.values(cars).find((c) => c.hasPage !== false &&
      c.make.toLowerCase() === make.trim().toLowerCase() &&
      c.model.toLowerCase() === model.trim().toLowerCase() &&
      c.year.trim() === year.trim());
    const sighting = { id, spotterUsername: me, make: make.trim(), model: model.trim(), year: year.trim(), trim: trim.trim(), photoUrl, verified: false, matchedCarId: matched ? matched.id : null, date: t };
    await save("sightings", { ...get().sightings, [id]: sighting });
    sync((uid2) => remote.write.sighting(uid2, sighting));
    if (matched && matched.ownerUsername !== me && !matched.spotterUsernames.includes(me)) {
      const event = { id: newId("t"), type: "spot", by: me, date: t };
      await save("cars", {
        ...get().cars,
        [matched.id]: { ...matched, spotterUsernames: [...matched.spotterUsernames, me], timeline: [...matched.timeline, event] },
      });
      sync((uid2) => remote.write.spot(uid2, matched.id, event));
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
    const id = newId("post");
    const t = now();
    const tagged = [...new Set(tags)].filter((h) => h !== me && get().users[h]).slice(0, 10);
    const carEvents = [];
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
      const postEvent = { id: newId("t"), type: "post", by: me, date: t, detail: caption.trim(), postId: id };
      carEvents.push({ carId, event: postEvent });
      let updatedCar = { ...car, timeline: [...car.timeline, postEvent] };
      if (car.ownerUsername !== me && !car.spotterUsernames.includes(me)) {
        const spotEvent = { id: newId("t"), type: "spot", by: me, date: t };
        carEvents.push({ carId, event: spotEvent, spot: true });
        updatedCar = { ...updatedCar, spotterUsernames: [...updatedCar.spotterUsernames, me], timeline: [...updatedCar.timeline, spotEvent] };
      }
      await save("cars", { ...get().cars, [carId]: updatedCar });
    }
    const saved = get().posts[id];
    const tagIds = tagged.map(idOf).filter(Boolean);
    sync((uid2) => remote.write.createPost(uid2, saved, tagIds, carEvents));
    for (const h of tagged) await pushNotif(h, { type: "tag", from: me, postId: id });
    flash("Posted");
    return id;
  };

  const editPost = async (postId, caption) => {
    const post = get().posts[postId];
    if (!post || post.authorUsername !== me) return;
    await save("posts", { ...get().posts, [postId]: { ...post, caption: caption.trim(), editedAt: now() } });
    sync((id) => remote.write.editPost(id, postId, caption.trim().slice(0, 280)));
    flash("Caption updated");
  };

  // Archived posts are hidden from everyone but can be brought back from Settings.
  const setArchived = async (postId, archived) => {
    const post = get().posts[postId];
    if (!post || post.authorUsername !== me) return;
    await save("posts", { ...get().posts, [postId]: { ...post, archived } });
    sync((id) => remote.write.archivePost(id, postId, archived));
    flash(archived ? "Post archived" : "Post restored");
  };

  const deletePost = async (postId) => {
    const d = get();
    const post = d.posts[postId];
    if (!post || post.authorUsername !== me) return;
    const { [postId]: _gone, ...posts } = d.posts;
    await save("posts", posts);
    sync((id) => remote.write.deletePost(id, postId));
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
    sync((id) => remote.write.likePost(id, postId, !has));
    if (!has) await pushNotif(post.authorUsername, { type: "like", from: me, postId });
    else await dropNotif(post.authorUsername, { type: "like", postId });
  };

  // Like a comment (or a reply to one). The person who wrote it gets one notification, not one per tap.
  const toggleCommentLike = async (postId, commentId, replyId) => {
    const p = get().posts[postId];
    if (!p) return;
    let author = null, nowLiked = false;
    const flip = (x) => {
      const likes = x.likes || [];
      author = x.author;
      nowLiked = !likes.includes(me);
      return { ...x, likes: nowLiked ? [...likes, me] : likes.filter((u) => u !== me) };
    };
    const comments = p.comments.map((c) => {
      if (c.id !== commentId) return c;
      if (!replyId) return flip(c);
      return { ...c, replies: (c.replies || []).map((r) => (r.id === replyId ? flip(r) : r)) };
    });
    await save("posts", { ...get().posts, [postId]: { ...p, comments } });
    const target = replyId || commentId;
    sync((id) => remote.write.likeComment(id, target, nowLiked));
    if (nowLiked) await pushNotif(author, { type: "commentLike", from: me, postId, commentId: target });
    else await dropNotif(author, { type: "commentLike", postId, commentId: target });
  };

  const addComment = async (postId, text) => {
    const post = get().posts[postId];
    if (!post || !text.trim()) return;
    const c = { id: newId("c"), author: me, text: text.trim().slice(0, 220), date: now(), replies: [] };
    await save("posts", { ...get().posts, [postId]: { ...post, comments: [...post.comments, c] } });
    sync((id) => remote.write.comment(id, postId, c));
    await pushNotif(post.authorUsername, { type: "comment", from: me, postId, text: text.trim().slice(0, 60) });
  };

  const addReply = async (postId, commentId, text) => {
    const post = get().posts[postId];
    if (!post || !text.trim()) return;
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) return;
    const reply = { id: newId("r"), author: me, text: text.trim().slice(0, 220), date: now() };
    await save("posts", { ...get().posts, [postId]: { ...post, comments: post.comments.map((c) => (c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c)) } });
    sync((id) => remote.write.comment(id, postId, reply, commentId));
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
    const themId = idOf(target);
    if (themId) sync((id) => remote.write.follow(id, themId, !isFollowing));
    if (!isFollowing) await pushNotif(target, { type: "follow", from: me });
    else await dropNotif(target, { type: "follow" });
  };

  // ---------- news / meets / communities ----------
  const toggleNewsLike = async (id) => {
    const item = get().news[id];
    if (!item) return;
    const has = item.likes.includes(me);
    await save("news", { ...get().news, [id]: { ...item, likes: has ? item.likes.filter((u) => u !== me) : [...item.likes, me] } });
    sync((uid2) => remote.write.likeNews(uid2, id, !has));
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
      sync((id) => remote.write.saveMeet(id, editingId, fields, false));
      flash("Meet updated");
      return editingId;
    }
    const id = newId("meet");
    await save("meets", { ...meets, [id]: { id, ...fields, submittedBy: me, createdAt: now(), attendees: [{ username: me, role: "organizer" }] } });
    sync((uid2) => remote.write.saveMeet(uid2, id, fields, true));
    flash("Meet posted");
    return id;
  };

  const deleteMeet = async (id) => {
    const meets = get().meets;
    if (!meets[id] || meets[id].submittedBy !== me) return;
    const { [id]: _gone, ...rest } = meets;
    await save("meets", rest);
    sync((uid2) => remote.write.deleteMeet(uid2, id));
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
      sync((uid2) => remote.write.setAttendance(uid2, id, uid2, null, true));
      return;
    }
    const cap = item.caps?.[role];
    if (cap && item.attendees.filter((a) => a.role === role).length >= cap) { flash(`${role === "driver" ? "Driving" : "Attending"} is full`); return; }
    const attendees = existing
      ? item.attendees.map((a) => (a.username === me ? { ...a, role } : a))
      : [...item.attendees, { username: me, role }];
    await save("meets", { ...get().meets, [id]: { ...item, attendees } });
    sync((uid2) => remote.write.setAttendance(uid2, id, uid2, role, !!existing));
  };

  // Organizer tools: move someone to another list, or take them off.
  const setMeetRole = async (meetId, username, role) => {
    const item = get().meets[meetId];
    if (!item || !isOrganizer(item, me) || username === item.submittedBy) return;
    const attendees = role
      ? item.attendees.map((a) => (a.username === username ? { ...a, role } : a))
      : item.attendees.filter((a) => a.username !== username);
    await save("meets", { ...get().meets, [meetId]: { ...item, attendees } });
    const themId = idOf(username);
    if (themId) sync((id) => remote.write.setAttendance(id, meetId, themId, role || null, true));
  };
  const setMeetCaps = async (meetId, caps) => {
    const item = get().meets[meetId];
    if (!item || !isOrganizer(item, me)) return;
    const clean = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : null; };
    const nextCaps = { driver: clean(caps.driver), attendee: clean(caps.attendee) };
    await save("meets", { ...get().meets, [meetId]: { ...item, caps: nextCaps } });
    sync((id) => remote.write.meetCaps(id, meetId, nextCaps));
    flash("Limits saved");
  };

  const nameTaken = (name, exceptId) => Object.values(get().communities).some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase());

  const createCommunity = async ({ name, description }) => {
    if (!name.trim()) return null;
    if (nameTaken(name)) { flash("A community with that name already exists"); return null; }
    const id = newId("community");
    const c = { id, name: name.trim().slice(0, 40), description: description.trim().slice(0, 200), kind: "custom", createdBy: me, members: [me], createdAt: now() };
    await save("communities", { ...get().communities, [id]: c });
    sync((uid2) => remote.write.createCommunity(uid2, c));
    flash("Community created");
    return id;
  };

  const editCommunity = async (id, { name, description }) => {
    const c = get().communities[id];
    if (!c || c.createdBy !== me || !name.trim()) return false;
    if (nameTaken(name, id)) { flash("A community with that name already exists"); return false; }
    await save("communities", { ...get().communities, [id]: { ...c, name: name.trim(), description: (description || "").trim() } });
    sync((uid2) => remote.write.editCommunity(uid2, id, name.trim().slice(0, 40), (description || "").trim().slice(0, 200)));
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
    sync((uid2) => remote.write.deleteCommunity(uid2, id));
    flash("Community deleted");
  };

  const toggleCommunityMembership = async (id) => {
    const c = get().communities[id];
    if (!c) return;
    const inIt = c.members.includes(me);
    await save("communities", { ...get().communities, [id]: { ...c, members: inIt ? c.members.filter((u) => u !== me) : [...c.members, me] } });
    sync((uid2) => remote.write.member(uid2, id, !inIt));
  };

  // ---------- community discussions ----------
  const joinIfNeeded = async (communityId) => {
    const c = get().communities[communityId];
    if (c && !c.members.includes(me)) {
      await save("communities", { ...get().communities, [c.id]: { ...c, members: [...c.members, me] } });
      sync((id) => remote.write.member(id, c.id, true));
    }
  };

  const createThread = async ({ communityId, title, body }) => {
    if (!title.trim() || !get().communities[communityId]) return null;
    const id = newId("thread");
    const t = { id, communityId, author: me, title: title.trim().slice(0, 100), body: (body || "").trim().slice(0, 1000), date: now(), likes: [], replies: [] };
    await save("discussions", { ...get().discussions, [id]: t });
    sync((uid2) => remote.write.createThread(uid2, t));
    await joinIfNeeded(communityId);
    flash("Discussion started");
    return id;
  };

  const replyThread = async (threadId, text) => {
    const t = get().discussions[threadId];
    if (!t || !text.trim()) return;
    const reply = { id: newId("r"), author: me, text: text.trim().slice(0, 500), date: now() };
    await save("discussions", { ...get().discussions, [threadId]: { ...t, replies: [...t.replies, reply] } });
    sync((id) => remote.write.replyThread(id, threadId, reply));
    await joinIfNeeded(t.communityId);
    await pushNotif(t.author, { type: "threadReply", from: me, threadId, text: text.trim().slice(0, 60) });
  };

  const toggleThreadLike = async (threadId) => {
    const t = get().discussions[threadId];
    if (!t) return;
    const has = t.likes.includes(me);
    await save("discussions", { ...get().discussions, [threadId]: { ...t, likes: has ? t.likes.filter((u) => u !== me) : [...t.likes, me] } });
    sync((id) => remote.write.likeThread(id, threadId, !has));
  };

  const deleteThread = async (threadId) => {
    const t = get().discussions[threadId];
    if (!t || t.author !== me) return;
    const { [threadId]: _gone, ...rest } = get().discussions;
    await save("discussions", rest);
    sync((id) => remote.write.deleteThread(id, threadId));
    flash("Discussion deleted");
  };

  const editThread = async (threadId, { title, body }) => {
    const t = get().discussions[threadId];
    if (!t || t.author !== me || !title.trim()) return;
    await save("discussions", { ...get().discussions, [threadId]: { ...t, title: title.trim(), body: (body || "").trim(), editedAt: now() } });
    sync((id) => remote.write.editThread(id, threadId, title.trim().slice(0, 100), (body || "").trim().slice(0, 1000)));
    flash("Discussion updated");
  };
  const deleteThreadReply = async (threadId, replyId) => {
    const t = get().discussions[threadId];
    if (!t) return;
    await save("discussions", { ...get().discussions, [threadId]: { ...t, replies: t.replies.filter((r) => !(r.id === replyId && r.author === me)) } });
    sync((id) => remote.write.deleteThreadReply(id, replyId));
  };
  const deleteComment = async (postId, commentId, replyId) => {
    const p = get().posts[postId];
    if (!p) return;
    const comments = replyId
      ? p.comments.map((c) => (c.id === commentId ? { ...c, replies: (c.replies || []).filter((r) => !(r.id === replyId && r.author === me)) } : c))
      : p.comments.filter((c) => !(c.id === commentId && c.author === me));
    await save("posts", { ...get().posts, [postId]: { ...p, comments } });
    sync((id) => remote.write.deleteComment(id, replyId || commentId));
  };

  // ---------- safety: report, not interested, block ----------
  const report = async ({ kind, id, reason, note }) => {
    if (REMOTE) { sync((me2) => remote.write.report(me2, { kind, id, reason, note })); flash("Thanks. We'll take a look."); return; }
    const rid = newId("report");
    const all = (await readShared(KEYS.reports)) || {};
    const next = { ...all, [rid]: { id: rid, kind, targetId: id, reason, note: (note || "").trim(), by: me, date: now(), status: "open" } };
    try { await window.storage.set(KEYS.reports, JSON.stringify(next), true); } catch { /* ignore */ }
    flash("Thanks. We'll take a look.");
  };
  const hidePost = async (postId) => {
    if (prefs.hidden.includes(postId)) return;
    await savePrefs({ ...prefs, hidden: [...prefs.hidden, postId] });
    sync((id) => remote.write.hidePost(id, postId, true));
    flash("Got it. You'll see fewer posts like this.");
  };
  const undoHide = async (postId) => {
    await savePrefs({ ...prefs, hidden: prefs.hidden.filter((x) => x !== postId) });
    sync((id) => remote.write.hidePost(id, postId, false));
  };
  const toggleBlock = async (handle) => {
    if (!handle || handle === me) return;
    const blocked = prefs.blocked.includes(handle);
    await savePrefs({ ...prefs, blocked: blocked ? prefs.blocked.filter((x) => x !== handle) : [...prefs.blocked, handle] });
    const themId = idOf(handle);
    if (themId) sync((id) => remote.write.block(id, themId, !blocked));
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
    sync((id) => remote.write.readNotifications(id));
  };

  return {
    me, loading, flash, prefs, remote: REMOTE, ...data,
    actions: {
      claimUsername, updateProfile, logout, deleteAccount, checkHandle, signUp, signIn, resetPassword, confirmReset,
      addCar, editCar, deleteCar, addMod, toggleFollowCar, spotCar, logSighting,
      createPost, editPost, setArchived, deletePost, toggleLike, addComment, addReply,
      toggleFollow, toggleNewsLike, submitMeet, deleteMeet, toggleGoing,
      createCommunity, toggleCommunityMembership, markNotificationsRead,
      toggleCommentLike,
      createThread, replyThread, toggleThreadLike, deleteThread, editThread, deleteThreadReply, deleteComment,
      setMeetRole, setMeetCaps, editCommunity, deleteCommunity,
      report, hidePost, undoHide, toggleBlock,
    },
  };
}
