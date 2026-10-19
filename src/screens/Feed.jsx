import { useState, useRef, useLayoutEffect } from "react";
import { Car, Compass, Heart, MessageCircle, Search, Bell } from "lucide-react";
import { T } from "../theme";
import { hueForId } from "../lib/utils";
import { Avatar, EmptyState, TextInput, BottomSheet } from "../components/ui";
import { CommentRow } from "./PostDetail";
import { PostMenu } from "../components/PostMenu";

// Remembers how far down the feed you were, so coming back lands on the same post.
const feedScroll = new Map();

export function Feed({ me, cars, posts, users, tab, setTab, openCar, openProfile, toggleLike, addComment, addReply, openSearch, openInbox, unreadCount, actions, scrollKey }) {
  const following = (users[me]?.following) || [];
  let list = Object.values(posts).filter((p) => !p.archived).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (tab === "following") list = list.filter((p) => following.includes(p.authorUsername));
  const [commentsPostId, setCommentsPostId] = useState(null);
  const commentsPost = commentsPostId ? posts[commentsPostId] : null;
  const scroller = useRef(null);
  const memoKey = `${scrollKey}-${tab}`;
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = feedScroll.get(memoKey) || 0;
  }, [memoKey, list.length > 0]);

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
        <div ref={scroller} data-testid="feed-scroller" onScroll={(e) => feedScroll.set(memoKey, e.currentTarget.scrollTop)} style={{
          height: "100%", overflowY: "auto", scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch",
        }}>
          {list.map((p) => (
            <FeedSlide key={p.id} post={p} car={cars[p.carId]} me={me} actions={actions}
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

export function FeedSlide({ post, car, me, openCar, openProfile, toggleLike, openComments, actions }) {
  const liked = post.likes.includes(me);
  const [pop, setPop] = useState(false);
  const hue = hueForId(post.id);
  const doLike = () => { toggleLike(post.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  return (
    <div data-testid="feed-slide" style={{
      height: "100%", width: "100%", scrollSnapAlign: "start", scrollSnapStop: "always",
      position: "relative", display: "flex", alignItems: "flex-end", overflow: "hidden",
      background: post.photoUrl ? "#000" : `linear-gradient(135deg, hsl(${hue},45%,20%), hsl(${hue},35%,10%))`,
    }}>
      {post.photoUrl ? (
        <>
          {/* Blurred copy fills the empty space; the real photo is shown whole, never cropped. */}
          <div aria-hidden style={{ position: "absolute", inset: -40, background: `url(${post.photoUrl}) center/cover`, filter: "blur(28px) brightness(0.55)" }} />
          <img src={post.photoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        </>
      ) : (
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

      {actions && (
        <div style={{ position: "absolute", right: 12, bottom: 190, zIndex: 3 }}>
          <PostMenu post={post} me={me} actions={actions} overlay />
        </div>
      )}
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
            color: "#fff", fontSize: 11.5, fontWeight: 700, marginBottom: 8,
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
