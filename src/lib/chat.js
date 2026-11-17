// Crew chat: the group chat inside each community.
// Messages aren't part of the big app load (a chat can get long); each open chat loads its
// newest messages and then listens for new ones. Online that's Supabase Realtime
// (plus a check every few seconds, which also picks up deleted messages);
// offline/test builds keep messages in the shared test storage.
import { REMOTE } from "../backend/config";
import { sb } from "../backend/client";
import { uploadIfNeeded } from "../backend/remote";

export const CHAT_LIMIT = 200;      // newest messages shown
export const MAX_MESSAGE = 1000;    // characters
const KEY = "carfooly-chat";
const POLL_MS = REMOTE ? 6000 : 1200;

// What each person can do in a community.
export function roleIn(c, handle, isAppAdmin = false) {
  if (!c || !handle) return null;
  if (c.createdBy === handle) return "owner";
  if ((c.admins || []).includes(handle)) return "admin";
  if (c.kind === "brand" && isAppAdmin) return "admin";
  if (c.members.includes(handle)) return "member";
  return null;
}
export const isGroupAdmin = (c, handle, isAppAdmin) => ["owner", "admin"].includes(roleIn(c, handle, isAppAdmin));

// Same rule as the database's can_chat().
export function canChat(c, handle, isAppAdmin = false) {
  const r = roleIn(c, handle, isAppAdmin);
  if (!r) return false;
  if (r === "owner" || r === "admin") return true;
  if (c.chatMode === "admins") return false;
  if (c.chatMode === "auto") return c.members.length <= (c.chatAutoLimit || 50);
  return true;
}

// ---------- offline storage ----------
const readAll = async () => { try { const r = await window.storage.get(KEY, true); return r ? JSON.parse(r.value) : {}; } catch { return {}; } };
const writeAll = (all) => window.storage.set(KEY, JSON.stringify(all), true);

// Online rows -> the shape the screen uses. byId turns an account id into a handle.
const fromRow = (r, byId) => ({
  id: r.id, communityId: r.community_id, author: byId(r.author_id), body: r.body || "",
  photoUrl: r.photo_url || null, replyTo: r.reply_to || null, meetId: r.meet_id || null, date: r.created_at, hidden: r.hidden,
});

export async function loadMessages(communityId, byId, pinnedId) {
  if (!REMOTE) return ((await readAll())[communityId] || []).slice(-CHAT_LIMIT);
  const { data, error } = await sb().from("community_messages").select("*").eq("community_id", communityId)
    .order("created_at", { ascending: false }).limit(CHAT_LIMIT);
  if (error) throw error;
  let rows = (data || []).reverse();
  // The pinned message may be older than what's loaded.
  if (pinnedId && !rows.some((r) => r.id === pinnedId)) {
    const { data: p } = await sb().from("community_messages").select("*").eq("id", pinnedId).maybeSingle();
    if (p) rows = [{ ...p, older: true }, ...rows];
  }
  return rows.map((r) => ({ ...fromRow(r, byId), older: !!r.older }));
}

// Calls onChange whenever the chat may have changed. Returns a stop function.
export function watchChat(communityId, onChange) {
  const timer = setInterval(() => { if (document.visibilityState === "visible") onChange(); }, POLL_MS);
  let channel = null;
  if (REMOTE) {
    try {
      channel = sb().channel(`chat-${communityId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` }, () => onChange())
        .subscribe();
    } catch { /* the regular check still runs */ }
  }
  return () => { clearInterval(timer); if (channel) sb().removeChannel(channel).catch(() => {}); };
}

export async function sendMessage({ communityId, me, myId, body, photoUrl, replyTo, meetId }) {
  const msg = { id: REMOTE ? crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, communityId, author: me, body: (body || "").trim().slice(0, MAX_MESSAGE), photoUrl: photoUrl || null, replyTo: replyTo || null, meetId: meetId || null, date: new Date().toISOString() };
  if (REMOTE) {
    const photo_url = photoUrl ? await uploadIfNeeded(myId, photoUrl) : null;
    const { error } = await sb().from("community_messages").insert({ id: msg.id, community_id: communityId, author_id: myId, body: msg.body, photo_url, reply_to: msg.replyTo, meet_id: msg.meetId });
    if (error) throw error;
    return { ...msg, photoUrl: photo_url };
  }
  const all = await readAll();
  all[communityId] = [...(all[communityId] || []), msg].slice(-500);
  await writeAll(all);
  return msg;
}

export async function deleteMessage(communityId, id) {
  if (REMOTE) {
    const { error } = await sb().from("community_messages").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const all = await readAll();
  all[communityId] = (all[communityId] || []).filter((m) => m.id !== id);
  await writeAll(all);
}

// Offline only: a community's chat goes when the community does.
export async function dropChat(communityId) {
  if (REMOTE) return;
  const all = await readAll();
  delete all[communityId];
  await writeAll(all);
}

// One message by id (admins looking at a report). Returns { message, communityId } or null.
export async function getMessage(id, byId) {
  if (REMOTE) {
    const { data } = await sb().from("community_messages").select("*").eq("id", id).maybeSingle();
    return data ? fromRow(data, byId) : null;
  }
  const all = await readAll();
  for (const list of Object.values(all)) { const m = list.find((x) => x.id === id); if (m) return m; }
  return null;
}

// Offline only: remove a message wherever it is (an admin removed a reported message).
export async function removeMessageLocal(id) {
  if (REMOTE) return;
  const all = await readAll();
  Object.keys(all).forEach((k) => { all[k] = all[k].filter((m) => m.id !== id); });
  await writeAll(all);
}
