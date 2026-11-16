import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { Car, Compass, Heart, MessageCircle, Search, Bell, MapPin, Share2, Maximize2, ChevronLeft } from "lucide-react";
import { T } from "../theme";
import { LogoIntro, logoWhite } from "../components/Logo";
import { hueForId, timeAgo } from "../lib/utils";
import { Avatar, FollowAvatar, EmptyState, TextInput, BottomSheet, AccountLabel, TabSlide } from "../components/ui";
import { CommentRow } from "./PostDetail";
import { PostMenu } from "../components/PostMenu";
import { PhotoCarousel, postPhotos, VideoButtons } from "../components/photo/PhotoCarousel";
import { useTapGestures } from "../lib/useTapGestures";
import { shareText } from "../lib/share";
import { ActionMenu } from "../components/ui";
import { MAX_LINES } from "../lib/text";
import { RichText } from "../components/RichText";
import { locale, tr , AT } from "../lib/i18n";

// Remembers how far down the feed you were, so coming back lands on the same post.
const feedScroll = new Map();
// Half-typed comments, per post, so closing the sheet doesn't lose them.
const drafts = new Map();
const railBtn = { width: 52, background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 };
const railCount = { color: "#fff", fontSize: 12, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.5)" };
const topIcon = { width: 46, height: 46, border: "none", borderRadius: 999, pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 };

// The home feed: a normal scrolling list of posts (like Instagram), under a header that stays put
// (logo, search, bell, For You / Following). "What's on" sits at the very top and scrolls away.
// onlyUser: one person's posts (opened from their profile), starting at startId.
export function Feed({ me, cars, posts, users, tab, setTab, openCar, openProfile, openPost, toggleLike, addComment, addReply, openSearch, openInbox, unreadCount, actions, scrollKey, onFollow, prefs, onlyUser, startId, meets = {}, news = {}, openMeet, openNews, onBack }) {
  const following = (users[me]?.following) || [];
  const hidden = prefs?.hidden || [], blocked = prefs?.blocked || [];
  let list = Object.values(posts).filter((p) => !p.archived && !hidden.includes(p.id) && !blocked.includes(p.authorUsername)).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (onlyUser) list = list.filter((p) => p.authorUsername === onlyUser);
  else if (tab === "following") list = list.filter((p) => following.includes(p.authorUsername));
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [holdId, setHoldId] = useState(null);
  const holdPost = holdId ? posts[holdId] : null;
  const commentsPost = commentsPostId ? posts[commentsPostId] : null;
  const scroller = useRef(null);
  const memoKey = `${scrollKey}-${tab}`;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (feedScroll.has(memoKey)) el.scrollTop = feedScroll.get(memoKey);
    else if (startId) {
      const node = el.querySelector(`[data-post-id="${startId}"]`);
      if (node) el.scrollTop = node.offsetTop - (el.querySelector("[data-feed-header]")?.offsetHeight || 0);
    } else el.scrollTop = 0;
  }, [memoKey, list.length > 0]);
  const tabs = [["foryou", tr("For You")], ["following", tr("Following")]];
  const [tabsHidden, setTabsHidden] = useState(false);
  const lastY = useRef(0);
  const onScroll = (e) => {
    const y = e.currentTarget.scrollTop;
    feedScroll.set(memoKey, y);
    const d = y - lastY.current;
    if (y < 80) setTabsHidden(false);
    else if (d > 6) setTabsHidden(true);
    else if (d < -6) setTabsHidden(false);
    if (Math.abs(d) > 6 || y < 80) lastY.current = y;
  };

  return (
    <div data-testid="feed" style={{ position: "relative", height: "100dvh", overflow: "hidden" }}>
      {!onlyUser && <LogoIntro />}
      <div ref={scroller} data-testid="feed-scroller" onScroll={onScroll}
        style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}>
        {/* room for the header, which floats above the list */}
        <div style={{ height: `calc(${onlyUser ? 58 : 58 + TABS_H}px + var(--inset-top))` }} />
        {/* Header: always reachable, posts scroll underneath it. For You / Following tuck away
            while you scroll down (more room for posts) and come back as soon as you scroll up. */}
        <div data-feed-header style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 9, background: "rgba(12,13,16,0.88)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid ${T.lineDark}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "calc(10px + var(--inset-top)) 14px 6px" }}>
            {onlyUser ? (
              <>
                {onBack && <button onClick={onBack} aria-label={tr("Back")} className="press" style={iconBtn}><ChevronLeft size={22} color={T.text} className="flip-rtl" /></button>}
                <div data-testid="user-posts-title" style={{ flex: 1, color: T.text, fontSize: 16, fontWeight: 700 }}>{AT}{onlyUser} · {list.length} {list.length === 1 ? tr("post") : tr("posts")}</div>
              </>
            ) : (
              <>
                <div data-testid="brand" style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={logoWhite} alt="" style={{ width: 30, height: 30 }} />
                  <span className="display" style={{ color: T.text, fontSize: 21, letterSpacing: "0.12em" }}>LACERTA</span>
                </div>
                <button onClick={openSearch} aria-label={tr("Search")} className="press" style={iconBtn}><Search size={22} color={T.text} /></button>
                <NotifBell count={unreadCount} onClick={openInbox} style={iconBtn} />
              </>
            )}
          </div>
          {!onlyUser && (
            <div data-testid="feed-tabs" data-hidden={tabsHidden || undefined} style={{ display: "flex", padding: "0 6px", overflow: "hidden", maxHeight: tabsHidden ? 0 : TABS_H, opacity: tabsHidden ? 0 : 1, transition: "max-height .25s ease, opacity .2s ease" }}>
              {tabs.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className="press" aria-current={tab === id ? "page" : undefined} style={{
                  flex: 1, background: "none", border: "none", padding: "10px 0 12px", position: "relative",
                  color: tab === id ? T.text : T.textDim, fontSize: 15, fontWeight: 700, transition: "color .2s ease",
                }}>
                  {label}
                  <span aria-hidden style={{ position: "absolute", bottom: 0, left: "28%", right: "28%", height: 3, borderRadius: 3, background: T.accent, transform: `scaleX(${tab === id ? 1 : 0})`, transition: "transform .25s cubic-bezier(.2,.8,.2,1)" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {!onlyUser && tab !== "following" && <LiveBar meets={meets} news={news} openMeet={openMeet} openNews={openNews} />}

        <TabSlide index={tab === "following" ? 1 : 0}>
          {list.length === 0 ? (
            <div style={{ padding: "40px 20px" }}>
              <EmptyState icon={<Compass size={22} color={T.textDim} />}
                title={tab === "following" ? tr("No posts yet") : tr("Nothing here yet")}
                body={tab === "following" ? tr("Follow people to see their posts here.") : tr("Be the first to post about a car.")} />
            </div>
          ) : list.map((p) => (
            <PostCard key={p.id} post={p} car={cars[p.carId]} me={me} actions={actions}
              following={following.includes(p.authorUsername)} onFollow={onFollow} onHold={() => setHoldId(p.id)}
              openCar={openCar} openProfile={openProfile} toggleLike={toggleLike} openPost={openPost}
              openComments={() => setCommentsPostId(p.id)} />
          ))}
          <div style={{ height: "calc(100px + var(--inset-bottom))" }} />
        </TabSlide>
      </div>

      {holdPost && (
        <QuickActions post={holdPost} me={me} car={cars[holdPost.carId]} onClose={() => setHoldId(null)}
          onLike={() => toggleLike(holdPost.id)} onComment={() => setCommentsPostId(holdPost.id)} onOpen={() => openPost && openPost(holdPost.id)} />
      )}
      <BottomSheet open={!!commentsPost} onClose={() => setCommentsPostId(null)} maxHeight="74vh" fixedHeight
        title={commentsPost ? (commentsPost.comments.length === 1 ? tr("1 comment") : tr("{0} comments", commentsPost.comments.length)) : ""}
        footer={commentsPost && <FeedCommentInput postId={commentsPost.id} addComment={addComment} />}>
        {commentsPost && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {commentsPost.caption && (
              <div data-testid="comments-caption" style={{ display: "flex", gap: 10, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${T.lineDark}` }}>
                <button onClick={() => { setCommentsPostId(null); openProfile(commentsPost.authorUsername); }} style={{ background: "none", border: "none", padding: 0, alignSelf: "flex-start" }}>
                  <Avatar username={commentsPost.authorUsername} size={32} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{commentsPost.authorUsername}</span>
                    <AccountLabel username={commentsPost.authorUsername} />
                    <span style={{ color: T.textDim, fontSize: 12 }}>· {timeAgo(commentsPost.date)}{commentsPost.editedAt ? tr(" · edited") : ""}</span>
                  </div>
                  <RichText text={commentsPost.caption} maxLines={MAX_LINES.caption} style={{ color: T.text, fontSize: 14, lineHeight: 1.45 }} />
                </div>
              </div>
            )}
            {commentsPost.comments.length === 0 && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 14 }}>{tr("No comments yet. Be the first.")}</div>}
            {commentsPost.comments.map((c) => (
              <CommentRow key={c.id} comment={c} postId={commentsPost.id} addReply={addReply} />
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

const TABS_H = 46;
const iconBtn = { width: 42, height: 42, border: "none", borderRadius: 999, background: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 };

// Posts run under the floating nav bar; buttons and captions sit just above it.
export const FEED_BOTTOM = "calc(84px + var(--inset-bottom))";

export function FeedCommentInput({ postId, addComment }) {
  const [text, setTextState] = useState(() => drafts.get(postId) || "");
  const setText = (v) => { setTextState(v); if (v) drafts.set(postId, v); else drafts.delete(postId); };
  return (
    // Shown as the comments panel's footer, so it's pinned to the bottom edge.
    <div data-testid="comment-bar" style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1 }}>
        <TextInput value={text} onChange={setText} placeholder={tr("Add a comment…")} maxLength={220} />
      </div>
      <button disabled={!text.trim()} className="press"
        onClick={async () => { const t = text; setText(""); const r = await addComment(postId, t); if (r === false) setText(t); }}
        style={{ padding: "0 16px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 600 }}>
        {tr("Post")}
      </button>
    </div>
  );
}

// One post in the feed: who posted it, the caption and tags, the photos, then like / comment / share.
// Double-tap the photo to like; hold for quick actions; tap a video to pause.
export function PostCard({ post, car, me, openCar, openProfile, openPost, toggleLike, openComments, actions, following, onFollow, onHold }) {
  const liked = post.likes.includes(me);
  const [pop, setPop] = useState(false);
  const [burst, setBurst] = useState(null);
  const mediaRef = useRef(null);
  const pics = postPhotos(post);
  const hasVideo = pics.some((p) => p.type === "video");
  // (Videos pause/play with their own tap and buttons.)
  const gesture = useTapGestures({
    onDoubleTap: (x, y) => { if (!liked) toggleLike(post.id); setBurst({ x, y, k: Date.now() }); },
    onHold: () => onHold && onHold(),
  });
  const hue = hueForId(post.id);
  const doLike = () => { toggleLike(post.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  const carName = car ? `${car.make} ${car.model}` : post.carLabel;
  const share = () => shareText({ title: tr("Lacerta"), text: tr("{0}{1} on Lacerta{2}", post.authorUsername, carName ? `'s ${carName}` : "", post.caption ? `: "${post.caption}"` : "") });
  return (
    <article data-testid="feed-slide" data-post-id={post.id} style={{ borderBottom: `1px solid ${T.lineDark}`, paddingTop: 14, animation: "fadeIn .3s ease" }}>
      {/* who + where */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 14px" }}>
        <FollowAvatar username={post.authorUsername} size={44} onOpen={() => openProfile(post.authorUsername)}
          showFollow={post.authorUsername !== me && !!onFollow} following={following} onFollow={() => onFollow(post.authorUsername)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => openProfile(post.authorUsername)} aria-label={post.authorUsername} style={{ background: "none", border: "none", padding: 0, color: T.text, fontSize: 15, fontWeight: 700 }}>
              {post.authorUsername}
            </button>
            <AccountLabel username={post.authorUsername} />
            {post.hidden && <span data-testid="hidden-mark" style={{ color: "#fff", fontSize: 10, fontWeight: 700, background: "rgba(212,67,77,0.85)", borderRadius: 5, padding: "2px 6px" }}>{tr("HIDDEN · REPORTED")}</span>}
          </div>
          <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 1 }}>
            {timeAgo(post.date)}{post.editedAt && <span data-testid="edited"> · {tr("edited")}</span>}
          </div>
          {post.location && (
            <div data-testid="feed-location" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent2, fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>
              <MapPin size={12} /> {post.location.label}
            </div>
          )}
        </div>
        {actions && <PostMenu post={post} me={me} actions={actions} carName={carName} />}
      </div>

      {/* caption + chips */}
      {post.caption && pics.length > 0 && (
        <div style={{ padding: "10px 14px 0" }}>
          <RichText text={post.caption} maxLines={MAX_LINES.caption} clamp={4} onMore={openComments} style={{ color: T.text, fontSize: 15, lineHeight: 1.45 }} />
        </div>
      )}
      {(car || post.carLabel || (post.tags || []).length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "10px 14px 0" }}>
          {car && <button onClick={() => openCar(car.id)} style={{ ...chip, borderColor: "rgba(212,67,77,0.55)", color: "#FFD6D9", cursor: car.hasPage === false ? "default" : "pointer" }}>{car.make} {car.model} '{car.year}</button>}
          {!car && post.carLabel && <span style={chip}>{post.carLabel}</span>}
          {(post.tags || []).length > 0 && <span data-testid="feed-tags" style={{ display: "contents" }}>{post.tags.map((h) => <button key={h} onClick={() => openProfile(h)} style={chip}>{AT}{h}</button>)}</span>}
        </div>
      )}

      {/* the photos / video (or a text card) */}
      <div ref={mediaRef} {...gesture} style={{ position: "relative", marginTop: 12 }}>
        {pics.length ? (
          <PhotoCarousel photos={pics} mode="card" />
        ) : (
          <div style={{ margin: "0 14px", minHeight: 160, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 22px",
            background: `radial-gradient(120% 90% at 0% 0%, hsla(${hue},45%,35%,0.55), transparent 60%), linear-gradient(135deg, hsl(${hue},30%,16%), ${T.surface})` }}>
            {post.caption
              ? <RichText text={post.caption} maxLines={MAX_LINES.caption} clamp={8} onDark style={{ color: "#fff", fontSize: post.caption.length > 120 ? 18 : 23, lineHeight: 1.3, textAlign: "center", fontWeight: 700 }} />
              : <Car size={44} color="rgba(245,244,242,0.3)" />}
          </div>
        )}
        {burst && (
          <Heart key={burst.k} size={100} color={T.accent} fill={T.accent} className="big-heart"
            style={{ position: "absolute", left: burst.x, top: burst.y, zIndex: 6, pointerEvents: "none", filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.4))" }} />
        )}
      </div>

      {/* actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 6px 8px" }}>
        <button onClick={openComments} aria-label={tr("Comments")} className="press" style={actBtn}>
          <MessageCircle size={21} color={T.textDim} /> <span>{post.comments.length}</span>
        </button>
        <button onClick={doLike} aria-label={tr("Like")} className="press" style={actBtn}>
          <Heart size={21} color={liked ? T.accent : T.textDim} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} /> <span style={{ color: liked ? T.text : T.textDim }}>{post.likes.length}</span>
        </button>
        <button onClick={share} aria-label={tr("Share")} className="press" style={actBtn}>
          <Share2 size={20} color={T.textDim} />
        </button>
        {openPost && (
          <button onClick={() => openPost(post.id)} aria-label={tr("Open post")} className="press" style={actBtn}>
            <Maximize2 size={19} color={T.textDim} />
          </button>
        )}
      </div>
    </article>
  );
}
const chip = { background: "rgba(138,155,170,0.08)", border: `1px solid rgba(138,155,170,0.35)`, borderRadius: 10, padding: "6px 12px", color: "#D7DEE4", fontSize: 13, fontWeight: 700 };
const actBtn = { background: "none", border: "none", padding: "10px 14px", display: "flex", alignItems: "center", gap: 7, color: T.textDim, fontSize: 14, fontWeight: 600 };

// Hold a post: the actions people reach for most, without hunting for buttons.
function QuickActions({ post, me, car, onClose, onLike, onComment, onOpen }) {
  const liked = post.likes.includes(me);
  const carName = car ? `${car.make} ${car.model}` : post.carLabel;
  return (
    <ActionMenu open onClose={onClose} items={[
      { label: liked ? tr("Unlike") : tr("Like"), icon: <Heart size={17} />, onClick: onLike },
      { label: tr("Comment"), icon: <MessageCircle size={17} />, onClick: onComment },
      { label: tr("Share"), icon: <Share2 size={17} />, onClick: () => shareText({ title: tr("Lacerta"), text: tr("{0}{1} on Lacerta{2}", post.authorUsername, carName ? `'s ${carName}` : "", post.caption ? `: "${post.caption}"` : "") }) },
      { label: tr("Open post"), icon: <Maximize2 size={17} />, onClick: onOpen },
    ]} />
  );
}

// The bell: no counter bubble. When something new arrives it rings and glows for a second;
// while there's anything unread it keeps a thin red ring.
export function NotifBell({ count, onClick, style }) {
  const [ping, setPing] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    if (count > last.current) setPing((p) => p + 1);
    last.current = count;
  }, [count]);
  return (
    <button onClick={onClick} aria-label={tr("Notifications")} title={count ? tr("{0} new", count) : undefined} data-testid="notif-bell" data-unread={count > 0 || undefined}
      className="press" style={{ ...style, position: "relative", boxShadow: count ? `inset 0 0 0 1.5px ${T.accent}` : style?.boxShadow,
        animation: ping ? "glowBlink 1.1s ease 1" : "none" }} key={ping}>
      <Bell size={21} color={count ? "#FFD6D9" : T.text} style={{ animation: ping ? "bellRing 0.9s ease 1" : "none", transformOrigin: "50% 10%" }} />
    </button>
  );
}

// Like a sports app's live scores: a strip of what's coming up (meets) and what's new (news),
// across the top of the feed. Can be folded away.
function LiveBar({ meets, news, openMeet, openNews }) {
  const now = Date.now();
  const soon = Object.values(meets)
    .filter((m) => m.when && new Date(m.when).getTime() > now - 4 * 3600e3)
    .sort((a, b) => new Date(a.when) - new Date(b.when)).slice(0, 4);
  const fresh = Object.values(news).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  const items = [];
  for (let i = 0; i < 4; i++) { if (soon[i]) items.push({ kind: "meet", m: soon[i] }); if (fresh[i]) items.push({ kind: "news", n: fresh[i] }); }
  if (!items.length) return null;
  const when = (iso) => {
    const t = new Date(iso).getTime();
    if (t <= now) return { live: true, label: tr("Live now") };
    const d = new Date(iso), today = new Date();
    const tm = d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === today.toDateString()) return { label: tr("Today · {0}", tm) };
    const tmr = new Date(); tmr.setDate(today.getDate() + 1);
    if (d.toDateString() === tmr.toDateString()) return { label: tr("Tomorrow · {0}", tm) };
    return { label: d.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" }) };
  };
  return (
    <section data-testid="live-bar" style={{ padding: "12px 0 14px", borderBottom: `1px solid ${T.lineDark}` }}>
      <div className="plate" style={{ fontSize: 10.5, color: T.textDim, padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 9, background: T.accent, animation: "logoPulse 1.6s ease-in-out infinite" }} /> {tr("What's on")}
      </div>
      <div data-noswipe style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 14px", scrollSnapType: "x proximity", scrollPaddingInline: 14 }}>
        {items.map((it) => {
          const meet = it.kind === "meet";
          const w = meet ? when(it.m.when) : null;
          const img = !meet && it.n.image;
          return (
            <button key={(meet ? "m" : "n") + (meet ? it.m.id : it.n.id)} data-testid={meet ? "live-meet" : "live-news"}
              onClick={() => (meet ? openMeet?.(it.m.id) : openNews?.())} className="press"
              style={{ flex: "0 0 auto", width: 236, height: 72, borderRadius: 18, border: `1px solid ${T.lineDark}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 11, textAlign: "start", scrollSnapAlign: "start", overflow: "hidden",
                background: meet ? `linear-gradient(135deg, rgba(212,67,77,0.16), ${T.surface} 70%)` : T.surface }}>
              {img ? <img src={img} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 50, height: 50, borderRadius: 12, objectFit: "cover", flexShrink: 0, background: T.surface2 }} />
                : <span style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: meet ? T.accent : T.accentWarm, flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="plate" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: meet ? (w.live ? "#FFB3B8" : T.textDim) : T.accentWarm }}>
                  {meet && w.live && <span style={{ width: 6, height: 6, borderRadius: 9, background: T.accent, animation: "logoPulse 1.2s ease-in-out infinite" }} />}
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meet ? `${tr("Meet")} · ${w.label}` : `${tr("News")} · ${it.n.source || ""}`}</span>
                </span>
                <span dir="auto" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: T.text, fontSize: 13, fontWeight: 700, lineHeight: 1.25, marginTop: 3 }}>
                  {meet ? it.m.title : it.n.title}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
