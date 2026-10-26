import { sb } from "./client";
import { SEED_NEWS } from "../lib/seedNews";

// The online backend. Two jobs:
//  1. load(): read everything the app shows and turn it into the same shape the
//     screens already use (people keyed by handle, cars/posts keyed by id…).
//  2. the write functions: save one change. The database itself checks every
//     rule (only your own posts, no double likes, meet limits…) and creates the
//     notifications, so a bad or old app can't break them.

const must = async (q) => {
  const { data, error } = await q;
  if (error) throw error;
  return data;
};
// Saving something that's already there (a second like) is fine — ignore it.
const insertOnce = async (table, row) => {
  const { error } = await sb().from(table).insert(row);
  if (error && error.code !== "23505") throw error;
};

// ---------- accounts ----------
export async function currentUserId() {
  const { data } = await sb().auth.getSession();
  return data?.session?.user?.id || null;
}

export async function handleAvailable(handle) {
  const { data, error } = await sb().rpc("handle_available", { p_handle: handle });
  if (error) return null; // unknown (offline): don't block, the database still checks
  return !!data;
}

const authMessage = (error) => {
  const m = (error?.message || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Log in instead.";
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Confirm your email first (check your inbox), then log in.";
  if (m.includes("database error")) return "That handle was just taken. Try another.";
  if (m.includes("rate") || m.includes("too many") || error?.status === 429) return "Too many tries. Wait a minute and try again.";
  if (m.includes("password")) return "Password needs at least 8 characters.";
  if (m.includes("email")) return "That email doesn't look right.";
  if (m.includes("fetch") || m.includes("network")) return "No connection. Check your internet and try again.";
  return "Something went wrong. Try again.";
};

export async function signUp({ email, password, handle, name }) {
  const { data, error } = await sb().auth.signUp({ email: email.trim(), password, options: { data: { handle, name: name.trim() } } });
  if (error) return { error: authMessage(error) };
  if (!data.session) return { needsConfirm: true };
  return { userId: data.user.id };
}

export async function signIn({ email, password }) {
  const { data, error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { error: authMessage(error) };
  return { userId: data.user.id };
}

export async function signOut() {
  try { await sb().auth.signOut(); } catch { /* already signed out */ }
}

export async function resetPassword(email) {
  const { error } = await sb().auth.resetPasswordForEmail(email.trim());
  return error ? { error: authMessage(error) } : {};
}

// Deletes your photos, then your account (everything you made goes with it).
export async function deleteAccount(userId) {
  try {
    const files = await must(sb().storage.from("photos").list(userId, { limit: 1000 }));
    if (files?.length) await sb().storage.from("photos").remove(files.map((f) => `${userId}/${f.name}`));
  } catch { /* photos are cleaned up best-effort */ }
  await must(sb().rpc("delete_my_account"));
  await signOut();
}

// ---------- photos ----------
// Photos made on the phone are "data:" text. Upload them and keep the web link instead.
export async function uploadIfNeeded(userId, url) {
  if (!url || typeof url !== "string" || !url.startsWith("data:")) return url || null;
  const blob = await (await fetch(url)).blob();
  const type = ["image/jpeg", "image/png", "image/webp"].includes(blob.type) ? blob.type : "image/jpeg";
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  await must(sb().storage.from("photos").upload(path, blob, { contentType: type, upsert: false }));
  return sb().storage.from("photos").getPublicUrl(path).data.publicUrl;
}

// ---------- loading ----------
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const group = (rows, key) => {
  const out = {};
  rows.forEach((r) => { (out[r[key]] ||= []).push(r); });
  return out;
};

export async function load(userId) {
  const t = (name, cols = "*", fn) => {
    let q = sb().from(name).select(cols);
    if (fn) q = fn(q);
    return must(q);
  };
  const [
    profiles, follows, cars, carMods, carEvents, carFollows, carSpots, sightings,
    communities, members, threads, threadReplies, threadLikes,
    posts, postLikes, comments, commentLikes, meets, attendees, newsLikes, notifications, blocks, hidden,
  ] = await Promise.all([
    t("profiles", "id,handle,name,bio,avatar_url,created_at"),
    t("follows", "follower_id,followee_id"),
    t("cars"), t("car_mods"), t("car_events"),
    t("car_follows", "car_id,user_id"), t("car_spots", "car_id,user_id"),
    t("sightings", "*", (q) => q.order("created_at", { ascending: false }).limit(500)),
    t("communities"), t("community_members", "community_id,user_id"),
    t("threads"), t("thread_replies"), t("thread_likes", "thread_id,user_id"),
    t("posts", "*", (q) => q.order("created_at", { ascending: false }).limit(500)),
    t("post_likes", "post_id,user_id"), t("comments"), t("comment_likes", "comment_id,user_id"),
    t("meets"), t("meet_attendees"),
    t("news_likes", "news_id,user_id"),
    t("notifications", "*", (q) => q.eq("recipient_id", userId).order("created_at", { ascending: false }).limit(200)),
    t("blocks", "blocked_id", (q) => q.eq("blocker_id", userId)),
    t("hidden_posts", "post_id", (q) => q.eq("user_id", userId)),
  ]);

  const H = {}; // user id -> handle
  profiles.forEach((p) => { H[p.id] = p.handle; });
  const h = (id) => H[id] || null;
  const handles = (rows, col) => rows.map((r) => h(r[col])).filter(Boolean);

  // People
  const followersOf = group(follows, "followee_id");
  const followingOf = group(follows, "follower_id");
  const users = {};
  profiles.forEach((p) => {
    users[p.handle] = {
      id: p.id, name: p.name || p.handle, bio: p.bio || "", avatar: p.avatar_url || null, joinedAt: p.created_at,
      followers: handles(followersOf[p.id] || [], "follower_id"),
      following: handles(followingOf[p.id] || [], "followee_id"),
    };
  });
  const me = h(userId);

  // Cars
  const modsOf = group(carMods, "car_id");
  const eventsOf = group(carEvents, "car_id");
  const fansOf = group(carFollows, "car_id");
  const spotsOf = group(carSpots, "car_id");
  const carsOut = {};
  cars.forEach((c) => {
    carsOut[c.id] = {
      id: c.id, make: c.make, model: c.model, year: c.year, nickname: c.nickname,
      engine: c.engine, power: c.power, gearbox: c.gearbox, weight: c.weight, wheels: c.wheels,
      zeroToSixty: c.zero_to_sixty, topSpeed: c.top_speed,
      ownerUsername: h(c.owner_id), photoUrl: c.photo_url || null, createdAt: c.created_at, hasPage: c.has_page,
      mods: (modsOf[c.id] || []).map((m) => ({ id: m.id, name: m.name, note: m.note, date: m.created_at })).sort(byDate),
      timeline: (eventsOf[c.id] || []).map((e) => ({
        id: e.id, type: e.type, by: h(e.actor_id), date: e.created_at,
        ...(e.detail ? { detail: e.detail } : {}), ...(e.mod_name ? { modName: e.mod_name, modNote: e.mod_note } : {}),
        ...(e.post_id ? { postId: e.post_id } : {}),
      })).sort(byDate),
      spotterUsernames: handles(spotsOf[c.id] || [], "user_id"),
      followerUsernames: handles(fansOf[c.id] || [], "user_id"),
    };
  });

  // Posts and comments
  const likesOf = group(postLikes, "post_id");
  const cLikesOf = group(commentLikes, "comment_id");
  const commentsOf = group(comments, "post_id");
  const postsOut = {};
  posts.forEach((p) => {
    const all = (commentsOf[p.id] || []).map((c) => ({
      id: c.id, parent: c.parent_id, author: h(c.author_id), text: c.text, date: c.created_at, likes: handles(cLikesOf[c.id] || [], "user_id"),
    })).sort(byDate);
    const top = all.filter((c) => !c.parent).map(({ parent, ...c }) => ({
      ...c, replies: all.filter((r) => r.parent === c.id).map(({ parent: _p, ...r }) => r),
    }));
    const photos = Array.isArray(p.photos) ? p.photos : [];
    postsOut[p.id] = {
      id: p.id, carId: p.car_id, carLabel: p.car_label, authorUsername: h(p.author_id),
      photos, photoUrl: photos[0]?.url || null, photoAspect: photos[0]?.aspect || null,
      caption: p.caption, date: p.created_at, likes: handles(likesOf[p.id] || [], "user_id"), comments: top,
      communityId: p.community_id, location: p.location || null,
      tags: (p.tags || []).map(h).filter(Boolean), archived: p.archived, ...(p.edited_at ? { editedAt: p.edited_at } : {}),
    };
  });

  // Communities and discussions
  const membersOf = group(members, "community_id");
  const communitiesOut = {};
  communities.forEach((c) => {
    communitiesOut[c.id] = {
      id: c.id, name: c.name, description: c.description, kind: c.kind, createdBy: h(c.created_by),
      members: handles(membersOf[c.id] || [], "user_id"), createdAt: c.created_at,
    };
  });
  const repliesOf = group(threadReplies, "thread_id");
  const tLikesOf = group(threadLikes, "thread_id");
  const discussions = {};
  threads.forEach((t2) => {
    discussions[t2.id] = {
      id: t2.id, communityId: t2.community_id, author: h(t2.author_id), title: t2.title, body: t2.body, date: t2.created_at,
      likes: handles(tLikesOf[t2.id] || [], "user_id"),
      replies: (repliesOf[t2.id] || []).map((r) => ({ id: r.id, author: h(r.author_id), text: r.text, date: r.created_at })).sort(byDate),
      ...(t2.edited_at ? { editedAt: t2.edited_at } : {}),
    };
  });

  // Meets
  const goingOf = group(attendees, "meet_id");
  const meetsOut = {};
  meets.forEach((m) => {
    meetsOut[m.id] = {
      id: m.id, title: m.title, location: m.location, lat: m.lat, lng: m.lng, city: m.city, country: m.country,
      when: m.starts_at, note: m.note, cover: m.cover_url || null, sponsors: m.sponsors || [],
      caps: { driver: m.driver_cap, attendee: m.attendee_cap },
      submittedBy: h(m.organizer_id), createdAt: m.created_at,
      attendees: (goingOf[m.id] || []).map((a) => ({ username: h(a.user_id), role: a.role })).filter((a) => a.username),
    };
  });

  // Sightings
  const sightingsOut = {};
  sightings.forEach((s) => {
    sightingsOut[s.id] = {
      id: s.id, spotterUsername: h(s.spotter_id), make: s.make, model: s.model, year: s.year, trim: s.trim,
      photoUrl: s.photo_url || null, verified: s.verified, matchedCarId: s.matched_car_id, date: s.created_at,
    };
  });

  // News: the built-in stories, plus who liked them.
  const newsLikesOf = group(newsLikes, "news_id");
  const news = {};
  SEED_NEWS.forEach((item) => { news[item.id] = { ...item, submittedBy: null, likes: handles(newsLikesOf[item.id] || [], "user_id") }; });

  // Your notifications only.
  const notifs = notifications.map((n) => ({
    id: n.id, type: n.type, from: h(n.actor_id), date: n.created_at, read: n.read,
    ...(n.post_id ? { postId: n.post_id } : {}), ...(n.car_id ? { carId: n.car_id } : {}),
    ...(n.comment_id ? { commentId: n.comment_id } : {}), ...(n.thread_id ? { threadId: n.thread_id } : {}),
    ...(n.text ? { text: n.text } : {}),
  })).filter((n) => n.from);

  return {
    me,
    data: {
      cars: carsOut, posts: postsOut, users, news, meets: meetsOut, communities: communitiesOut,
      notifications: me ? { [me]: notifs } : {}, sightings: sightingsOut, discussions,
    },
    prefs: { hidden: hidden.map((x) => x.post_id), blocked: blocks.map((b) => h(b.blocked_id)).filter(Boolean) },
  };
}

// ---------- writes ----------
// `me` is your user id. Other people are passed as their user ids.
export const write = {
  profile: async (me, { name, bio, avatar }) => {
    const avatar_url = await uploadIfNeeded(me, avatar);
    await must(sb().from("profiles").update({ name, bio, avatar_url }).eq("id", me));
  },

  // cars
  addCar: async (me, car, brand) => {
    const photo_url = await uploadIfNeeded(me, car.photoUrl);
    await must(sb().from("cars").insert({
      id: car.id, owner_id: me, make: car.make, model: car.model, year: car.year, nickname: car.nickname,
      engine: car.engine, power: car.power, gearbox: car.gearbox, weight: car.weight, wheels: car.wheels,
      zero_to_sixty: car.zeroToSixty, top_speed: car.topSpeed, photo_url, has_page: car.hasPage,
    }));
    for (const m of car.mods) await must(sb().from("car_mods").insert({ id: m.id, car_id: car.id, name: m.name, note: m.note }));
    for (const e of car.timeline) await write.carEvent(me, car.id, e);
    if (brand) await must(sb().rpc("join_brand_community", { p_name: brand }));
  },
  carEvent: (me, carId, e) => must(sb().from("car_events").insert({
    id: e.id, car_id: carId, type: e.type, actor_id: me, detail: e.detail || "", mod_name: e.modName || "", mod_note: e.modNote || "", post_id: e.postId || null,
  })),
  editCar: async (me, car) => {
    const photo_url = await uploadIfNeeded(me, car.photoUrl);
    await must(sb().from("cars").update({
      make: car.make, model: car.model, year: car.year, nickname: car.nickname,
      engine: car.engine, power: car.power, gearbox: car.gearbox, weight: car.weight, wheels: car.wheels,
      zero_to_sixty: car.zeroToSixty, top_speed: car.topSpeed, photo_url, has_page: car.hasPage,
    }).eq("id", car.id));
  },
  deleteCar: (me, carId) => must(sb().from("cars").delete().eq("id", carId)),
  addMod: async (me, carId, mod, event) => {
    await must(sb().from("car_mods").insert({ id: mod.id, car_id: carId, name: mod.name, note: mod.note }));
    await write.carEvent(me, carId, event);
  },
  followCar: (me, carId, on) => on
    ? insertOnce("car_follows", { car_id: carId, user_id: me })
    : must(sb().from("car_follows").delete().eq("car_id", carId).eq("user_id", me)),
  spot: async (me, carId, event) => {
    await insertOnce("car_spots", { car_id: carId, user_id: me });
    if (event) await write.carEvent(me, carId, event);
  },
  sighting: async (me, s) => {
    const photo_url = await uploadIfNeeded(me, s.photoUrl);
    await must(sb().from("sightings").insert({
      id: s.id, spotter_id: me, make: s.make, model: s.model, year: s.year, trim: s.trim, photo_url, matched_car_id: s.matchedCarId,
    }));
  },

  // posts
  createPost: async (me, post, tagIds, carEvents) => {
    const photos = [];
    for (const p of post.photos) photos.push({ url: await uploadIfNeeded(me, p.url), aspect: p.aspect ?? null });
    await must(sb().from("posts").insert({
      id: post.id, author_id: me, car_id: post.carId, car_label: post.carLabel, community_id: post.communityId,
      photos, caption: post.caption, location: post.location, tags: tagIds,
    }));
    for (const { carId, event, spot } of carEvents) {
      if (spot) await insertOnce("car_spots", { car_id: carId, user_id: me }).catch(() => {});
      await write.carEvent(me, carId, event).catch(() => {}); // a car without a public page can't take others' events
    }
  },
  editPost: (me, postId, caption) => must(sb().from("posts").update({ caption, edited_at: new Date().toISOString() }).eq("id", postId)),
  archivePost: (me, postId, archived) => must(sb().from("posts").update({ archived }).eq("id", postId)),
  deletePost: (me, postId) => must(sb().from("posts").delete().eq("id", postId)),
  likePost: (me, postId, on) => on
    ? insertOnce("post_likes", { post_id: postId, user_id: me })
    : must(sb().from("post_likes").delete().eq("post_id", postId).eq("user_id", me)),
  likeComment: (me, commentId, on) => on
    ? insertOnce("comment_likes", { comment_id: commentId, user_id: me })
    : must(sb().from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", me)),
  comment: (me, postId, c, parentId) => must(sb().from("comments").insert({ id: c.id, post_id: postId, author_id: me, parent_id: parentId || null, text: c.text })),
  deleteComment: (me, commentId) => must(sb().from("comments").delete().eq("id", commentId)),

  // people
  follow: (me, themId, on) => on
    ? insertOnce("follows", { follower_id: me, followee_id: themId })
    : must(sb().from("follows").delete().eq("follower_id", me).eq("followee_id", themId)),
  block: (me, themId, on) => on
    ? insertOnce("blocks", { blocker_id: me, blocked_id: themId })
    : must(sb().from("blocks").delete().eq("blocker_id", me).eq("blocked_id", themId)),
  hidePost: (me, postId, on) => on
    ? insertOnce("hidden_posts", { user_id: me, post_id: postId })
    : must(sb().from("hidden_posts").delete().eq("user_id", me).eq("post_id", postId)),
  report: (me, r) => must(sb().from("reports").insert({ reporter_id: me, kind: r.kind, target_id: String(r.id), reason: (r.reason || "").slice(0, 80), note: (r.note || "").slice(0, 300) })),
  readNotifications: (me) => must(sb().from("notifications").update({ read: true }).eq("recipient_id", me).eq("read", false)),

  // news
  likeNews: (me, newsId, on) => on
    ? insertOnce("news_likes", { news_id: newsId, user_id: me })
    : must(sb().from("news_likes").delete().eq("news_id", newsId).eq("user_id", me)),

  // meets
  saveMeet: async (me, id, f, isNew) => {
    const row = {
      title: f.title, location: f.location.slice(0, 160), lat: f.lat, lng: f.lng, city: f.city, country: f.country,
      starts_at: f.when, note: f.note, cover_url: await uploadIfNeeded(me, f.cover), sponsors: f.sponsors,
      driver_cap: f.caps.driver, attendee_cap: f.caps.attendee,
    };
    if (isNew) await must(sb().from("meets").insert({ id, organizer_id: me, ...row }));
    else await must(sb().from("meets").update(row).eq("id", id));
  },
  deleteMeet: (me, id) => must(sb().from("meets").delete().eq("id", id)),
  // role null = leave / remove. `had` = the person was already on a list.
  setAttendance: async (me, meetId, userId, role, had) => {
    if (!role) return must(sb().from("meet_attendees").delete().eq("meet_id", meetId).eq("user_id", userId));
    if (had) return must(sb().from("meet_attendees").update({ role }).eq("meet_id", meetId).eq("user_id", userId));
    return must(sb().from("meet_attendees").insert({ meet_id: meetId, user_id: userId, role }));
  },
  meetCaps: (me, meetId, caps) => must(sb().rpc("set_meet_caps", { p_meet: meetId, p_driver: caps.driver, p_attendee: caps.attendee })),

  // communities
  createCommunity: async (me, c) => {
    await must(sb().from("communities").insert({ id: c.id, name: c.name, description: c.description, kind: "custom", created_by: me }));
    await insertOnce("community_members", { community_id: c.id, user_id: me });
  },
  editCommunity: (me, id, name, description) => must(sb().from("communities").update({ name, description }).eq("id", id)),
  deleteCommunity: (me, id) => must(sb().from("communities").delete().eq("id", id)),
  member: (me, id, on) => on
    ? insertOnce("community_members", { community_id: id, user_id: me })
    : must(sb().from("community_members").delete().eq("community_id", id).eq("user_id", me)),
  createThread: (me, t) => must(sb().from("threads").insert({ id: t.id, community_id: t.communityId, author_id: me, title: t.title, body: t.body })),
  editThread: (me, id, title, body) => must(sb().from("threads").update({ title, body, edited_at: new Date().toISOString() }).eq("id", id)),
  deleteThread: (me, id) => must(sb().from("threads").delete().eq("id", id)),
  replyThread: (me, threadId, r) => must(sb().from("thread_replies").insert({ id: r.id, thread_id: threadId, author_id: me, text: r.text })),
  deleteThreadReply: (me, id) => must(sb().from("thread_replies").delete().eq("id", id)),
  likeThread: (me, id, on) => on
    ? insertOnce("thread_likes", { thread_id: id, user_id: me })
    : must(sb().from("thread_likes").delete().eq("thread_id", id).eq("user_id", me)),
};

// Friendly words for errors the database sends back.
export function writeMessage(error) {
  const m = (error?.message || "").toLowerCase();
  if (m === "full" || m.includes(" full")) return "That list is full";
  if (m.includes("communities_name_unique") || (error?.code === "23505" && m.includes("communit"))) return "A community with that name already exists";
  if (m.includes("blocked")) return "You can't do that with this person";
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to")) return "No connection. That change wasn't saved.";
  return "Couldn't save that. Try again.";
}
