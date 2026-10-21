import { useState, useRef, useLayoutEffect } from "react";
import { Car, Compass, Heart, MessageCircle, Search, Bell, MapPin } from "lucide-react";
import { T } from "../theme";
import { hueForId } from "../lib/utils";
import { Avatar, FollowAvatar, EmptyState, TextInput, BottomSheet } from "../components/ui";
import { CommentRow } from "./PostDetail";
import { PostMenu } from "../components/PostMenu";
import { PhotoCarousel, postPhotos } from "../components/photo/PhotoCarousel";
import { useSwipe } from "../lib/useSwipe";

// Remembers how far down the feed you were, so coming back lands on the same post.
const feedScroll = new Map();
// Half-typed comments, per post, so closing the sheet doesn't lose them.
const drafts = new Map();
const railBtn = { width: 52, background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 };
const railCount = { color: "#fff", fontSize: 12, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.5)" };
const topIcon = { width: 46, height: 46, border: "none", borderRadius: 999, pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 };

export function Feed({ me, cars, posts, users, tab, setTab, openCar, openProfile, toggleLike, addComment, addReply, openSearch, openInbox, unreadCount, actions, scrollKey, onFollow, prefs }) {
  const following = (users[me]?.following) || [];
  const hidden = prefs?.hidden || [], blocked = prefs?.blocked || [];
  let list = Object.values(posts).filter((p) => !p.archived && !hidden.includes(p.id) && !blocked.includes(p.authorUsername)).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (tab === "following") list = list.filter((p) => following.includes(p.authorUsername));
  const [commentsPostId, setCommentsPostId] = useState(null);
  const commentsPost = commentsPostId ? posts[commentsPostId] : null;
  const scroller = useRef(null);
  // Swipe left on a post = open that person's profile. Swipe right = switch For You / Following.
  const sw = useSwipe({
    onLeft: () => {
      const el = scroller.current;
      const i = el ? Math.round(el.scrollTop / Math.max(1, el.clientHeight)) : 0;
      const post = list[i];
      if (post) openProfile(post.authorUsername);
    },
    onRight: () => setTab(tab === "foryou" ? "following" : "foryou"),
  });
  const memoKey = `${scrollKey}-${tab}`;
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = feedScroll.get(memoKey) || 0;
  }, [memoKey, list.length > 0]);

  return (
    <div {...sw.bind} data-testid="feed" style={{ ...sw.bind.style, position: "relative", height: "calc(100vh - 92px)", background: T.bg, overflow: "hidden" }}>
      {/* Top controls: search on the left, tabs in the middle, notifications on the right. */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 8, display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 8, padding: "14px 14px 34px",
        background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))",
        pointerEvents: "none",
      }}>
        <button onClick={openSearch} aria-label="Search" className="glass-light press" style={topIcon}>
          <Search size={21} color="#fff" />
        </button>
        <div className="glass-light" style={{ display: "flex", borderRadius: 999, padding: 4, pointerEvents: "auto" }}>
          {[["foryou", "For You"], ["following", "Following"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className="press" style={{
              background: tab === id ? "rgba(255,255,255,0.92)" : "none", border: "none",
              padding: "9px 17px", borderRadius: 999,
              fontSize: 14.5, fontWeight: 700, color: tab === id ? T.ink : "rgba(255,255,255,0.75)",
            }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={openInbox} aria-label="Notifications" className="glass-light press" style={{ ...topIcon, position: "relative" }}>
          <Bell size={21} color="#fff" />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 9, right: 10, width: 9, height: 9, borderRadius: 99,
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
        <div ref={scroller} data-testid="feed-scroller" onScroll={(e) => feedScroll.set(memoKey, e.currentTarget.scrollTop)} style={{
          transform: sw.dx ? `translateX(${sw.dx * 0.35}px)` : "none", transition: sw.dx ? "none" : "transform .2s ease",
          height: "100%", overflowY: "auto", scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch",
        }}>
          {list.map((p) => (
            <FeedSlide key={p.id} post={p} car={cars[p.carId]} me={me} actions={actions}
              following={following.includes(p.authorUsername)} onFollow={onFollow}
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

export function FeedCommentInput({ postId, addComment }) {
  const [text, setTextState] = useState(() => drafts.get(postId) || "");
  const setText = (v) => { setTextState(v); if (v) drafts.set(postId, v); else drafts.delete(postId); };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8, position: "sticky", bottom: -12, paddingTop: 8, paddingBottom: 4, background: "rgba(24,24,27,0.96)", marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
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

export function FeedSlide({ post, car, me, openCar, openProfile, toggleLike, openComments, actions, following, onFollow }) {
  const liked = post.likes.includes(me);
  const [pop, setPop] = useState(false);
  const hue = hueForId(post.id);
  const pics = postPhotos(post);
  const doLike = () => { toggleLike(post.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div data-testid="feed-slide" style={{
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
            ? <div className="display" style={{ color: "#fff", fontSize: post.caption.length > 120 ? 20 : 27, lineHeight: 1.25, textAlign: "center" }}>{post.caption}</div>
            : <Car size={52} color="rgba(245,244,242,0.3)" />}
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 65%)" }} />

      {/* Right-side action column: like, comment, and (on your own posts) the ··· menu, all lined up. */}
      <div style={{ position: "absolute", right: 6, bottom: 20, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <button onClick={doLike} aria-label="Like" style={railBtn}>
          <Heart size={30} color={liked ? T.accent : "#fff"} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
          <span style={railCount}>{post.likes.length}</span>
        </button>
        <button onClick={openComments} aria-label="Comments" style={railBtn}>
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
        </div>
        {(post.location || (post.tags || []).length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600, marginBottom: 8, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            {post.location && <span data-testid="feed-location" style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {post.location.label}</span>}
            {(post.tags || []).length > 0 && <span data-testid="feed-tags">with {post.tags.map((h, k) => <button key={h} onClick={() => openProfile(h)} style={{ background: "none", border: "none", padding: 0, color: "#fff", fontWeight: 700, fontSize: 12 }}>@{h}{k < post.tags.length - 1 ? ", " : ""}</button>)}</span>}
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
