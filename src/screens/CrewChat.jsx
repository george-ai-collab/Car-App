// Crew chat: the WhatsApp-style group chat inside a community (replaces Discuss).
// Who can write depends on the group's settings: everyone, admins only, or everyone
// until the group reaches a size (then admins only). Owner/admins can pin and delete.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Image as ImageIcon, CalendarDays, X, Pin, Reply, Trash2, Flag, Copy, Lock, MapPin, ChevronRight, Shield, Crown, Loader2 } from "lucide-react";
import { T } from "../theme";
import { tr, locale } from "../lib/i18n";
import { hueForId, fmtWhen, isPast } from "../lib/utils";
import { Avatar, BottomSheet } from "../components/ui";
import { ReportSheet, useSafety } from "../components/Safety";
import { readPhoto } from "../components/photo/CameraCapture";
import { useKeyboardOffset } from "../lib/keyboard";
import { loadMessages, watchChat, sendMessage, deleteMessage, canChat, roleIn, isGroupAdmin, MAX_MESSAGE } from "../lib/chat";

const dayLabel = (iso) => {
  const d = new Date(iso), t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return tr("Today");
  if (d.toDateString() === y.toDateString()) return tr("Yesterday");
  return d.toLocaleDateString(locale(), { weekday: "short", month: "short", day: "numeric" });
};
const clock = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });

export function CrewChat({ community: c, me, users, meets = {}, isAppAdmin, myId, openProfile, openMeet, onPin, flash }) {
  const safety = useSafety();
  const blocked = safety?.prefs.blocked || [];
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [meetPicker, setMeetPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const atBottom = useRef(true);
  const kb = useKeyboardOffset();

  const member = c.members.includes(me) || roleIn(c, me, isAppAdmin) === "admin";
  const role = roleIn(c, me, isAppAdmin);
  const admin = isGroupAdmin(c, me, isAppAdmin);
  const mayWrite = canChat(c, me, isAppAdmin);
  const byId = useMemo(() => {
    const map = {};
    Object.entries(users).forEach(([handle, u]) => { if (u.id) map[u.id] = handle; });
    return (id) => map[id] || null;
  }, [users]);

  const reload = useCallback(async () => {
    try { setMsgs(await loadMessages(c.id, byId, c.pinnedId)); } catch { setMsgs((m) => m || []); }
  }, [c.id, c.pinnedId, byId]);
  useEffect(() => {
    if (!member) return;
    reload();
    return watchChat(c.id, reload);
  }, [member, c.id, reload]);

  // Keep the newest message in view (unless you've scrolled up to read older ones).
  useEffect(() => {
    const onScroll = () => { atBottom.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const count = msgs?.length || 0;
  useEffect(() => { if (atBottom.current) endRef.current?.scrollIntoView({ block: "end" }); }, [count]);

  if (!member) {
    const asked = (c.requests || []).includes(me);
    return (
      <div data-testid="chat-locked" style={{ textAlign: "center", padding: "40px 20px", color: T.textDim }}>
        <Lock size={22} color={T.textDim} />
        <div style={{ color: T.text, fontWeight: 700, fontSize: 15, marginTop: 10 }}>{tr("Members only")}</div>
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
          {asked ? tr("Your request to join is waiting for an admin.") : c.joinMode === "approval" && c.kind === "custom" ? tr("Ask to join to see the chat.") : tr("Join to see the chat and say hi.")}
        </div>
      </div>
    );
  }

  const shown = (msgs || []).filter((m) => !blocked.includes(m.author));
  const byMsgId = Object.fromEntries((msgs || []).map((m) => [m.id, m]));
  const pinned = c.pinnedId ? byMsgId[c.pinnedId] : null;

  const send = async () => {
    const body = text.trim();
    if ((!body && !photo) || sending) return;
    if (safety?.actions?.refuseText && safety.actions.refuseText(body)) return;
    setSending(true);
    try {
      const m = await sendMessage({ communityId: c.id, me, myId, body, photoUrl: photo, replyTo: replyTo?.id });
      setText(""); setPhoto(null); setReplyTo(null);
      atBottom.current = true;
      setMsgs((list) => [...(list || []), m]);
      reload();
    } catch (e) {
      const msg = String(e?.message || "").toLowerCase();
      flash(msg.includes("row-level") ? tr("Only admins can send messages here right now.") : msg.includes("not allowed words") ? tr("That includes words we don't allow on Carfooly. Please keep it respectful.") : tr("Couldn't send that. Try again."));
    }
    setSending(false);
  };
  const shareMeet = async (meetId) => {
    setMeetPicker(false);
    try {
      const m = await sendMessage({ communityId: c.id, me, myId, body: "", meetId });
      atBottom.current = true; setMsgs((list) => [...(list || []), m]); reload();
    } catch { flash(tr("Couldn't send that. Try again.")); }
  };
  const remove = async (m) => {
    setMenuFor(null);
    try { await deleteMessage(c.id, m.id); setMsgs((list) => list.filter((x) => x.id !== m.id)); if (c.pinnedId === m.id) onPin(c.id, null); }
    catch { flash(tr("Couldn't delete that. Try again.")); }
  };
  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { const r = await readPhoto(f, 1280, 0.8); setPhoto(r.src); } catch { flash(tr("Couldn't open that photo.")); }
  };

  const why = c.chatMode === "admins" ? tr("Only admins can send messages in this group.")
    : tr("Only admins can send messages once the group has more than {0} members.", c.chatAutoLimit || 50);
  const upcoming = Object.values(meets).filter((m) => m.when && !isPast(m.when)).sort((a, b) => new Date(a.when) - new Date(b.when)).slice(0, 20);
  const nameColor = (h) => `hsl(${hueForId(h)}, 70%, 68%)`;
  const badge = (h) => {
    const r = roleIn(c, h, !!users[h]?.isAdmin);
    if (r === "owner") return <Crown size={11} color={T.accentWarm} aria-label={tr("Owner")} />;
    if (r === "admin") return <Shield size={11} color={T.accent2} aria-label={tr("Admin")} />;
    return null;
  };

  let lastDay = "";
  return (
    <div data-testid="crew-chat" style={{ paddingBottom: 76 + (photo || replyTo ? 64 : 0) }}>
      {pinned && (
        <button data-testid="chat-pinned" onClick={() => document.getElementById(`m-${pinned.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}
          style={{ position: "sticky", top: "var(--inset-top)", zIndex: 5, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 10, borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface2, textAlign: "start" }}>
          <Pin size={14} color={T.accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="plate" style={{ fontSize: 9.5, color: T.accent }}>{tr("Pinned")}</div>
            <div style={{ color: T.text, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pinned.body || (pinned.photoUrl ? tr("Photo") : meets[pinned.meetId]?.title || tr("Meet"))}</div>
          </div>
        </button>
      )}

      {msgs === null && <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 size={20} color={T.textDim} style={{ animation: "spin 1s linear infinite" }} /></div>}
      {msgs && shown.length === 0 && (
        <div data-testid="chat-empty" style={{ textAlign: "center", color: T.textDim, fontSize: 13, padding: "34px 12px", lineHeight: 1.5 }}>
          {mayWrite ? tr("No messages yet. Say hi to the group.") : tr("No messages yet.")}
        </div>
      )}

      {shown.map((m, i) => {
        const mine = m.author === me;
        const day = dayLabel(m.date);
        const sep = day !== lastDay && !m.older; if (sep) lastDay = day;
        const prev = shown[i - 1];
        const grouped = prev && prev.author === m.author && !sep && new Date(m.date) - new Date(prev.date) < 5 * 60000;
        const quoted = m.replyTo ? byMsgId[m.replyTo] : null;
        const meet = m.meetId ? meets[m.meetId] : null;
        return (
          <div key={m.id}>
            {sep && <div style={{ textAlign: "center", margin: "14px 0 8px" }}><span className="plate" style={{ fontSize: 10, color: T.textDim, background: T.surface, padding: "4px 10px", borderRadius: 999 }}>{day}</span></div>}
            <div id={`m-${m.id}`} data-testid="chat-msg" style={{ display: "flex", gap: 8, justifyContent: mine ? "flex-end" : "flex-start", marginTop: grouped ? 3 : 10 }}>
              {!mine && (grouped ? <div style={{ width: 28 }} /> : <button onClick={() => openProfile(m.author)} style={{ background: "none", border: "none", padding: 0, alignSelf: "flex-start" }}><Avatar username={m.author} size={28} /></button>)}
              <button onClick={() => setMenuFor(m)} style={{
                maxWidth: "78%", textAlign: "start", border: "none", padding: m.photoUrl && !m.body ? 4 : "8px 11px",
                borderRadius: 18, borderStartEndRadius: mine && !grouped ? 6 : 18, borderStartStartRadius: !mine && !grouped ? 6 : 18,
                background: mine ? T.accent : T.surface2, color: mine ? "#fff" : T.text, boxShadow: T.shadowCard,
              }}>
                {!mine && !grouped && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: nameColor(m.author), marginBottom: 2, padding: m.photoUrl && !m.body ? "4px 7px 2px" : 0 }}>
                    {m.author} {badge(m.author)}
                  </div>
                )}
                {quoted && (
                  <div style={{ borderInlineStart: `3px solid ${mine ? "rgba(255,255,255,0.7)" : T.accent2}`, background: mine ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.05)", borderRadius: 8, padding: "4px 8px", marginBottom: 5, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, opacity: 0.9 }}>{quoted.author}</div>
                    <div style={{ opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{quoted.body || (quoted.photoUrl ? tr("Photo") : tr("Meet"))}</div>
                  </div>
                )}
                {m.photoUrl && <img src={m.photoUrl} alt="" style={{ display: "block", width: "100%", maxWidth: 260, borderRadius: 14, marginBottom: m.body ? 6 : 0 }} />}
                {meet && (
                  <span role="link" onClick={(e) => { e.stopPropagation(); openMeet(meet.id); }} data-testid="chat-meet" style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, background: mine ? "rgba(0,0,0,0.18)" : T.surface, minWidth: 210 }}>
                    <CalendarDays size={20} color={mine ? "#fff" : T.accent} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 700, fontSize: 13.5 }}>{meet.title}</span>
                      <span style={{ display: "block", fontSize: 11.5, opacity: 0.85 }}>{fmtWhen(meet.when)}</span>
                      {meet.location && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, opacity: 0.75, marginTop: 2 }}><MapPin size={10} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meet.location}</span></span>}
                    </span>
                    <ChevronRight size={14} />
                  </span>
                )}
                {m.meetId && !meet && <div style={{ fontSize: 13, opacity: 0.8, fontStyle: "italic" }}>{tr("This meet isn't available anymore.")}</div>}
                {m.body && <div dir="auto" style={{ fontSize: 14.5, lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word", padding: m.photoUrl ? "0 7px 2px" : 0 }}>{m.body}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, fontSize: 10, opacity: 0.7, marginTop: 2, padding: m.photoUrl && !m.body ? "0 7px 3px" : 0 }}>
                  {c.pinnedId === m.id && <Pin size={9} />}{clock(m.date)}
                </div>
              </button>
            </div>
          </div>
        );
      })}
      {/* Scrolling to the newest message keeps it above the writing bar and the nav. */}
      <div ref={endRef} style={{ scrollMarginBottom: "calc(170px + var(--inset-bottom))" }} />

      {/* Writing bar, stuck above the nav (or the keyboard). */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: kb ? kb : "calc(84px + var(--inset-bottom))", zIndex: 30, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: "100%", maxWidth: 480, padding: "8px 12px", background: T.bg, borderTop: `1px solid ${T.lineDark}`, pointerEvents: "auto" }}>
          {!mayWrite ? (
            <div data-testid="chat-readonly" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", color: T.textDim, fontSize: 12.5, padding: "10px 0" }}>
              <Lock size={13} /> {why}
            </div>
          ) : (
            <>
              {(replyTo || photo) && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "6px 10px", borderRadius: 12, background: T.surface }}>
                  {photo ? <img src={photo} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} /> : <Reply size={16} color={T.accent2} />}
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                    {replyTo && <><div style={{ color: T.accent2, fontWeight: 700 }}>{tr("Replying to {0}", replyTo.author)}</div><div style={{ color: T.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyTo.body || tr("Photo")}</div></>}
                    {!replyTo && <div style={{ color: T.textDim }}>{tr("Photo ready to send")}</div>}
                  </div>
                  <button aria-label={tr("Cancel")} onClick={() => { setReplyTo(null); setPhoto(null); }} style={{ background: "none", border: "none", padding: 4 }}><X size={16} color={T.textDim} /></button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <button aria-label={tr("Add a photo")} data-testid="chat-photo" onClick={() => fileRef.current?.click()} style={iconBtn}><ImageIcon size={19} color={T.textDim} /></button>
                <button aria-label={tr("Share a meet")} data-testid="chat-share-meet" onClick={() => setMeetPicker(true)} style={iconBtn}><CalendarDays size={19} color={T.textDim} /></button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} data-testid="chat-photo-input" />
                <textarea data-testid="chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Message")} rows={1} maxLength={MAX_MESSAGE} dir="auto"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                  style={{ flex: 1, resize: "none", maxHeight: 110, padding: "10px 14px", borderRadius: 20, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, fontFamily: "inherit", lineHeight: 1.35 }} />
                <button aria-label={tr("Send")} data-testid="chat-send" onClick={send} disabled={(!text.trim() && !photo) || sending} className="press"
                  style={{ width: 42, height: 42, borderRadius: 999, border: "none", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: text.trim() || photo ? T.accent : T.surface2 }}>
                  {sending ? <Loader2 size={17} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={17} color={text.trim() || photo ? "#fff" : T.textDim} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* What you can do with a message */}
      <BottomSheet open={!!menuFor} onClose={() => setMenuFor(null)} title={tr("Message")}>
        {menuFor && (
          <div data-testid="chat-msg-menu">
            {mayWrite && <SheetRow icon={<Reply size={17} />} label={tr("Reply")} onClick={() => { setReplyTo(menuFor); setMenuFor(null); }} />}
            {menuFor.body && <SheetRow icon={<Copy size={17} />} label={tr("Copy text")} onClick={() => { navigator.clipboard?.writeText(menuFor.body).catch(() => {}); setMenuFor(null); flash(tr("Copied")); }} />}
            {admin && <SheetRow icon={<Pin size={17} />} label={c.pinnedId === menuFor.id ? tr("Unpin") : tr("Pin to the top")} onClick={() => { onPin(c.id, c.pinnedId === menuFor.id ? null : menuFor.id); setMenuFor(null); }} />}
            {(menuFor.author === me || admin) && <SheetRow danger icon={<Trash2 size={17} />} label={menuFor.author === me ? tr("Delete") : tr("Delete for everyone")} onClick={() => remove(menuFor)} />}
            {menuFor.author !== me && <SheetRow icon={<Flag size={17} />} label={tr("Report")} onClick={() => { setReportId(menuFor.id); setMenuFor(null); }} />}
          </div>
        )}
      </BottomSheet>
      {safety && <ReportSheet open={!!reportId} onClose={() => setReportId(null)} what={tr("message")} onSend={(reason, note) => safety.actions.report({ kind: "message", id: reportId, reason, note })} />}

      <BottomSheet open={meetPicker} onClose={() => setMeetPicker(false)} title={tr("Share a meet")} maxHeight="70vh">
        {upcoming.length === 0 ? <div style={{ color: T.textDim, fontSize: 13 }}>{tr("No upcoming meets.")}</div> : upcoming.map((m) => (
          <button key={m.id} data-testid="chat-meet-option" onClick={() => shareMeet(m.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, textAlign: "start" }}>
            <CalendarDays size={18} color={T.accent} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{m.title}</div>
              <div style={{ color: T.textDim, fontSize: 12 }}>{fmtWhen(m.when)}{m.location ? ` · ${m.location}` : ""}</div>
            </div>
          </button>
        ))}
      </BottomSheet>
    </div>
  );
}

const iconBtn = { width: 38, height: 42, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: 0 };

function SheetRow({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 2px", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, color: danger ? T.accent : T.text, fontSize: 15, fontWeight: 600, textAlign: "start" }}>
      {icon} {label}
    </button>
  );
}
