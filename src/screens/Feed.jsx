import { useState, useRef, useLayoutEffect } from "react";
import { Car, Compass, Heart, MessageCircle, Search, Bell, MapPin, Share2, Maximize2 } from "lucide-react";
import { T } from "../theme";
import { hueForId, timeAgo } from "../lib/utils";
import { Avatar, FollowAvatar, EmptyState, TextInput, BottomSheet, AccountLabel } from "../components/ui";
import { CommentRow } from "./PostDetail";
import { PostMenu } from "../components/PostMenu";
import { PhotoCarousel, postPhotos } from "../components/photo/PhotoCarousel";
import { useTapGestures } from "../lib/useTapGestures";
import { shareText } from "../lib/share";
import { ActionMenu } from "../components/ui";
import { MAX_LINES } from "../lib/text";
import { RichText } from "../components/RichText";
import { tr , AT } from "../lib/i18n";

// Remembers how far down the feed you were, so coming back lands on the same post.
const feedScroll = new Map();
// Half-typed comments, per post, so closing the sheet doesn't lose them.
const drafts = new Map();
const railBtn = { width: 52, background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 };
const railCount = { color: "#fff", fontSize: 12, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.5)" };
const topIcon = { width: 46, height: 46, border: "none", borderRadius: 999, pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 };

// onlyUser: one person's posts (opened from their profile), starting at startId; scroll down for the next.
export function Feed({ me, cars, posts, users, tab, setTab, openCar, openProfile, openPost, toggleLike, addComment, addReply, openSearch, openInbox, unreadCount, actions, scrollKey, onFollow, prefs, onlyUser, startId }) {
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
      const i = list.findIndex((p) => p.id === startId);
      if (i > 0) el.scrollTop = i * el.clientHeight;
    } else el.scrollTop = 0;
  }, [memoKey, list.length > 0]);

  return (
    <div data-testid="feed" style={{ position: "relative", height: "calc(100vh - 92px)", background: T.bg, overflow: "hidden" }}>
      {/* Top controls: search on the left, tabs in the middle, notifications on the right. */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 8, display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 8, padding: "14px 14px 34px",
        background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))",
        pointerEvents: "none",
      }}>
        {onlyUser ? (
          <div data-testid="user-posts-title" className="glass-light" style={{ margin: "0 auto", borderRadius: 999, padding: "9px 16px", color: "#fff", fontSize: 14, fontWeight: 700 }}>
            {AT}{onlyUser} · {list.length} {list.length === 1 ? tr("post") : tr("posts")}
          </div>
        ) : <>
        <button onClick={openSearch} aria-label={tr("Search")} className="glass-light press" style={topIcon}>
          <Search size={21} color="#fff" />
        </button>
        <div className="glass-light" style={{ display: "flex", borderRadius: 999, padding: 4, pointerEvents: "auto" }}>
          {[["foryou", tr("For You")], ["following", tr("Following")]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className="press" style={{
              background: tab === id ? "rgba(255,255,255,0.92)" : "none", border: "none",
              padding: "9px 17px", borderRadius: 999,
              fontSize: 14.5, fontWeight: 700, color: tab === id ? T.ink : "rgba(255,255,255,0.75)",
            }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={openInbox} aria-label={tr("Notifications")} className="glass-light press" style={{ ...topIcon, position: "relative" }}>
          <Bell size={21} color="#fff" />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 9, right: 10, width: 9, height: 9, borderRadius: 99,
              background: T.accent, border: `1.5px solid rgba(0,0,0,0.3)`,
            }} />
          )}
        </button>
        </>}
      </div>

      {list.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <EmptyState icon={<Compass size={22} color={T.textDim} />}
            title={tab === "following" ? tr("No posts yet") : tr("Nothing here yet")}
            body={tab === "following" ? tr("Follow people to see their posts here.") : tr("Be the first to post about a car.")} />
        </div>
      ) : (
        <div ref={scroller} data-testid="feed-scroller" onScroll={(e) => feedScroll.set(memoKey, e.currentTarget.scrollTop)} style={{
          height: "100%", overflowY: "auto", scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch",
        }}>
          {list.map((p) => (
            <FeedSlide key={p.id} post={p} car={cars[p.carId]} me={me} actions={actions}
              following={following.includes(p.authorUsername)} onFollow={onFollow} onHold={() => setHoldId(p.id)}
              openCar={openCar} openProfile={openProfile} toggleLike={toggleLike}
              openComments={() => setCommentsPostId(p.id)} />
          ))}
        </div>
      )}

      {holdPost && (
        <QuickActions post={holdPost} me={me} car={cars[holdPost.carId]} onClose={() => setHoldId(null)}
          onLike={() => toggleLike(holdPost.id)} onComment={() => setCommentsPostId(holdPost.id)} onOpen={() => openPost && openPost(holdPost.id)} />
      )}
      <BottomSheet open={!!commentsPost} onClose={() => setCommentsPostId(null)} maxHeight="74vh" fixedHeight
        title={commentsPost ? `${commentsPost.comments.length} ${commentsPost.comments.length === 1 ? "comment" : "comments"}` : ""}>
        {commentsPost && (
          // Fills the panel so the comment box stays pinned at the bottom, even with few comments.
          <div style={{ minHeight: "calc(74vh - 96px)", display: "flex", flexDirection: "column" }}>
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
            <div style={{ flex: 1 }} />
            <FeedCommentInput postId={commentsPost.id} addComment={addComment} />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export function FeedCommentInput({ postId, addComment }) {
  const [text, setTextState] = useState(() => drafts.get(postId) || "");
  const setText = (v) => { setTextState(v); if (v) drafts.set(postId, v); else drafts.delete(postId); };
  return (
    // Pinned to the very bottom of the panel (covers the panel's bottom padding too).
    <div style={{ display: "flex", gap: 8, marginTop: 8, position: "sticky", bottom: "calc(-24px - env(safe-area-inset-bottom))", paddingTop: 10, paddingBottom: "calc(14px + env(safe-area-inset-bottom))", marginBottom: "calc(-24px - env(safe-area-inset-bottom))", background: "rgba(24,24,27,0.98)", borderTop: `1px solid ${T.lineDark}`, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
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

export function FeedSlide({ post, car, me, openCar, openProfile, toggleLike, openComments, actions, following, onFollow, onHold }) {
  const liked = post.likes.includes(me);
  const [pop, setPop] = useState(false);
  const [burst, setBurst] = useState(null);
  // Double-tap anywhere on the post to like it (never un-likes, like Instagram). Hold for quick actions.
  const gesture = useTapGestures({
    onDoubleTap: (x, y) => { if (!liked) toggleLike(post.id); setBurst({ x, y, k: Date.now() }); },
    onHold: () => onHold && onHold(),
  });
  const hue = hueForId(post.id);
  const pics = postPhotos(post);
  const doLike = () => { toggleLike(post.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div data-testid="feed-slide" {...gesture} style={{
      height: "100%", width: "100%", scrollSnapAlign: "start", scrollSnapStop: "always",
      position: "relative", display: "flex", alignItems: "flex-end", overflow: "hidden",
      background: pics.length ? "#000" : `linear-gradient(135deg, hsl(${hue},45%,20%), hsl(${hue},35%,10%))`,
    }}>
      {pics.length ? (
        // Whole photos, never cropped; swipe sideways when there are several.
        <PhotoCarousel photos={pics} mode="feed" />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "90px 28px 160px" }}>
          {post.caption
            ? <RichText text={post.caption} maxLines={MAX_LINES.caption} clamp={8} onDark style={{ color: "#fff", fontSize: post.caption.length > 120 ? 20 : 27, lineHeight: 1.25, textAlign: "center", fontWeight: 700 }} />
            : <Car size={52} color="rgba(245,244,242,0.3)" />}
        </div>
      )}
      {burst && (
        <Heart key={burst.k} size={110} color={T.accent} fill={T.accent} className="big-heart"
          style={{ position: "absolute", left: burst.x, top: burst.y, zIndex: 6, pointerEvents: "none", filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.4))" }} />
      )}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 65%)" }} />

      {/* Right-side action column: like, comment, and (on your own posts) the ··· menu, all lined up. */}
      <div style={{ position: "absolute", right: 6, bottom: 20, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <button onClick={doLike} aria-label={tr("Like")} style={railBtn}>
          <Heart size={30} color={liked ? T.accent : "#fff"} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
          <span style={railCount}>{post.likes.length}</span>
        </button>
        <button onClick={openComments} aria-label={tr("Comments")} style={railBtn}>
          <MessageCircle size={29} color="#fff" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
          <span style={railCount}>{post.comments.length}</span>
        </button>
        {actions && <PostMenu post={post} me={me} actions={actions} overlay carName={car ? `${car.make} ${car.model}` : post.carLabel} />}
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "0 72px 22px 14px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <FollowAvatar username={post.authorUsername} size={34} onOpen={() => openProfile(post.authorUsername)}
            showFollow={post.authorUsername !== me && !!onFollow} following={following} onFollow={() => onFollow(post.authorUsername)} />
          <button onClick={() => openProfile(post.authorUsername)} style={{ background: "none", border: "none", padding: 0, color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            {post.authorUsername}
          </button>
          <AccountLabel username={post.authorUsername} onDark />
          {post.hidden && <span data-testid="hidden-mark" style={{ color: "#fff", fontSize: 10.5, fontWeight: 700, background: "rgba(230,56,70,0.85)", borderRadius: 5, padding: "2px 6px" }}>{tr("HIDDEN · REPORTED")}</span>}
          {post.editedAt && <span data-testid="edited" style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{tr("edited")}</span>}
        </div>
        {(post.location || (post.tags || []).length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600, marginBottom: 8, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            {post.location && <span data-testid="feed-location" style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {post.location.label}</span>}
            {(post.tags || []).length > 0 && <span data-testid="feed-tags">{tr("with")} {post.tags.map((h, k) => <button key={h} onClick={() => openProfile(h)} style={{ background: "none", border: "none", padding: 0, color: "#fff", fontWeight: 700, fontSize: 12 }}>{AT}{h}{k < post.tags.length - 1 ? ", " : ""}</button>)}</span>}
          </div>
        )}
        {car && (
          <button onClick={() => openCar(car.id)} style={{
            cursor: car.hasPage === false ? "default" : "pointer",
            background: "rgba(230,56,70,0.9)", border: "none", borderRadius: 999, padding: "4px 10px",
            color: "#fff", fontSize: 11.5, fontWeight: 700, marginBottom: 8,
          }}>
            {car.make} {car.model} '{car.year}
          </button>
        )}
        {!car && post.carLabel && (
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.16)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "4px 10px", color: "#fff", fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
            {post.carLabel}
          </div>
        )}
        {post.caption && pics.length > 0 && (
          // Two lines here; "more" opens the comments panel with the full caption on top (like TikTok).
          <RichText text={post.caption} maxLines={MAX_LINES.caption} clamp={2} onDark onMore={openComments}
            style={{ color: "#fff", fontSize: 13.5, lineHeight: 1.4, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />
        )}
      </div>
    </div>
  );
}

// Hold a post: the actions people reach for most, without hunting for buttons.
function QuickActions({ post, me, car, onClose, onLike, onComment, onOpen }) {
  const liked = post.likes.includes(me);
  const carName = car ? `${car.make} ${car.model}` : post.carLabel;
  return (
    <ActionMenu open onClose={onClose} items={[
      { label: liked ? tr("Unlike") : tr("Like"), icon: <Heart size={17} />, onClick: onLike },
      { label: tr("Comment"), icon: <MessageCircle size={17} />, onClick: onComment },
      { label: tr("Share"), icon: <Share2 size={17} />, onClick: () => shareText({ title: tr("Carfooly"), text: tr("{0}{1} on Carfooly{2}", post.authorUsername, carName ? `'s ${carName}` : "", post.caption ? `: "${post.caption}"` : "") }) },
      { label: tr("Open post"), icon: <Maximize2 size={17} />, onClick: onOpen },
    ]} />
  );
}
