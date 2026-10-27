import { useState } from "react";
import { Car, Heart, MapPin } from "lucide-react";
import { T } from "../theme";
import { timeAgo, hueForId } from "../lib/utils";
import { Avatar, TextInput, SectionLabel } from "../components/ui";
import { PostMenu } from "../components/PostMenu";
import { PhotoCarousel, postPhotos } from "../components/photo/PhotoCarousel";
import { ReportSheet, useSafety } from "../components/Safety";
import { useTapGestures } from "../lib/useTapGestures";

export function PostDetail({ post, car, me, openCar, openProfile, toggleLike, addComment, addReply, actions, onGone }) {
  const [text, setText] = useState("");
  const [pop, setPop] = useState(false);
  const liked = post.likes.includes(me);
  const hue = hueForId(post.id);
  const doLike = () => { toggleLike(post.id); if (!liked) { setPop(true); setTimeout(() => setPop(false), 350); } };
  const [burst, setBurst] = useState(null);
  const photoTaps = useTapGestures({ onDoubleTap: (x, y) => { if (!liked) toggleLike(post.id); setBurst({ x, y, k: Date.now() }); } });
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      {post.archived && (
        <div style={{ fontSize: 12.5, color: T.accentWarm, background: "rgba(242,184,75,0.12)", borderRadius: 12, padding: "8px 12px", marginBottom: 12 }}>
          Archived — only you can see this post.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <button onClick={() => openProfile(post.authorUsername)} style={{ background: "none", border: "none", padding: 0 }}>
          <Avatar username={post.authorUsername} size={34} />
        </button>
        <div>
          <button onClick={() => openProfile(post.authorUsername)} style={{ background: "none", border: "none", padding: 0, color: T.text, fontSize: 14, fontWeight: 600 }}>
            {post.authorUsername}
          </button>
          {car && (
            <div>
              <button onClick={() => openCar(car.id)} style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: 12 }}>
                {car.make} {car.model} '{car.year}
              </button>
            </div>
          )}
          {!car && post.carLabel && <div style={{ color: T.textDim, fontSize: 12 }}>{post.carLabel}</div>}
        </div>
        <div style={{ flex: 1 }} />
        {actions && <PostMenu post={post} me={me} actions={actions} onDeleted={onGone} carName={car ? `${car.make} ${car.model}` : post.carLabel} />}
      </div>

      {postPhotos(post).length ? (
        <div style={{ marginBottom: 12, position: "relative" }} data-testid="detail-photo" {...photoTaps}>
          <PhotoCarousel photos={postPhotos(post)} mode="detail" />
          {burst && <Heart key={burst.k} size={96} color={T.accent} fill={T.accent} className="big-heart" style={{ position: "absolute", left: burst.x, top: burst.y, pointerEvents: "none", zIndex: 3 }} />}
        </div>
      ) : post.caption ? null : (
        <div style={{
          height: 220, borderRadius: 18, overflow: "hidden", background: `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${hue},35%,12%))`,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
        }}>
          <Car size={36} color="rgba(245,244,242,0.4)" />
        </div>
      )}

      {post.caption && <div style={{ color: T.text, fontSize: postPhotos(post).length ? 14.5 : 20, fontWeight: postPhotos(post).length ? 400 : 600, lineHeight: 1.4, marginBottom: 12, whiteSpace: "pre-wrap" }}>{post.caption}</div>}
      {(post.location || (post.tags || []).length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", color: T.textDim, fontSize: 12.5, marginBottom: 10 }}>
          {post.location && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {post.location.label}</span>}
          {(post.tags || []).length > 0 && <span>with {post.tags.map((h, k) => <button key={h} onClick={() => openProfile(h)} style={{ background: "none", border: "none", padding: 0, color: T.text, fontWeight: 700, fontSize: 12.5 }}>@{h}{k < post.tags.length - 1 ? ", " : ""}</button>)}</span>}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: T.textDim, marginBottom: 12 }}>{timeAgo(post.date)}{post.editedAt ? " · Edited" : ""}</div>

      <div style={{ display: "flex", gap: 16, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${T.lineDark}` }}>
        <button onClick={doLike} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
          <Heart size={18} color={liked ? T.accent : T.textDim} fill={liked ? T.accent : "none"} className={pop ? "heart-pop" : ""} />
          <span style={{ fontSize: 13, color: T.textDim }}>{post.likes.length} likes</span>
        </button>
      </div>

      <SectionLabel>Comments</SectionLabel>
      {post.comments.length === 0 && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 14 }}>No comments yet.</div>}
      {post.comments.map((c) => (
        <CommentRow key={c.id} comment={c} postId={post.id} addReply={addReply} />
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <TextInput value={text} onChange={setText} placeholder="Add a comment…" maxLength={220} />
        </div>
        <button
          disabled={!text.trim()}
          onClick={() => { addComment(post.id, text); setText(""); }}
          style={{ padding: "0 16px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 600 }}
        >
          Post
        </button>
      </div>
    </div>
  );
}

// Small "Delete" (yours) or "Report" (others) link under a comment or reply.
function CommentAction({ author, onDelete, kind, id }) {
  const safety = useSafety();
  const [reporting, setReporting] = useState(false);
  if (!safety) return null;
  const linkStyle = { background: "none", border: "none", padding: 0, fontSize: 11, color: T.textDim, fontWeight: 600 };
  if (author === safety.me) return <button onClick={onDelete} className="press" style={linkStyle}>Delete</button>;
  return (
    <>
      <button onClick={() => setReporting(true)} className="press" style={linkStyle}>Report</button>
      <ReportSheet open={reporting} onClose={() => setReporting(false)} what={kind} onSend={(reason, note) => safety.actions.report({ kind, id, reason, note })} />
    </>
  );
}

// Heart on a comment or reply. Double-tapping the comment does the same.
function CommentHeart({ item, me, onToggle, small }) {
  const likes = item.likes || [];
  const on = likes.includes(me);
  return (
    <button aria-label={on ? "Unlike comment" : "Like comment"} data-testid="comment-heart" onClick={onToggle} style={{ background: "none", border: "none", padding: "2px 0 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
      <Heart size={small ? 12 : 14} color={on ? T.accent : T.textDim} fill={on ? T.accent : "none"} />
      {likes.length > 0 && <span style={{ fontSize: 10, color: T.textDim }}>{likes.length}</span>}
    </button>
  );
}

export function CommentRow({ comment, postId, addReply }) {
  const safety = useSafety();
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [text, setText] = useState("");
  const blocked = safety?.prefs.blocked || [];
  const replies = (comment.replies || []).filter((r) => !blocked.includes(r.author));
  const me = safety?.me;
  const likeIt = (replyId) => safety && safety.actions.toggleCommentLike(postId, comment.id, replyId);
  const dbl = useTapGestures({ onDoubleTap: () => { if (!(comment.likes || []).includes(me)) likeIt(); } });
  if (blocked.includes(comment.author)) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 9 }}>
        <Avatar username={comment.author} size={26} />
        <div style={{ flex: 1 }} data-testid="comment-body" {...dbl}>
          <div style={{ fontSize: 13, color: T.text }}>
            <span style={{ fontWeight: 600 }}>{comment.author}</span> {comment.text}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
            <span style={{ fontSize: 10.5, color: T.textDim }}>{timeAgo(comment.date)}</span>
            <button onClick={() => setReplying((r) => !r)} className="press" style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: T.textDim, fontWeight: 600 }}>
              Reply
            </button>
            <CommentAction author={comment.author} kind="comment" id={comment.id} onDelete={() => safety.actions.deleteComment(postId, comment.id)} />
          </div>
        </div>
        {safety && <CommentHeart item={comment} me={me} onToggle={() => likeIt()} />}
      </div>

      {replying && (
        <div className="fade-in" style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 35 }}>
          <div style={{ flex: 1 }}>
            <TextInput value={text} onChange={setText} placeholder={`Reply to ${comment.author}…`} maxLength={220} />
          </div>
          <button disabled={!text.trim()} className="press"
            onClick={() => { addReply(postId, comment.id, text); setText(""); setReplying(false); setShowReplies(true); }}
            style={{ padding: "0 14px", borderRadius: 16, border: "none", background: text.trim() ? T.accent : T.surface2, color: text.trim() ? "#fff" : T.textDim, fontWeight: 600, fontSize: 12.5 }}>
            Send
          </button>
        </div>
      )}

      {replies.length > 0 && (
        <div style={{ marginLeft: 35, marginTop: 8 }}>
          <button onClick={() => setShowReplies((s) => !s)} className="press" style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 5, color: T.accent2, fontSize: 11.5, fontWeight: 600 }}>
            <div style={{ width: 20, height: 1, background: T.lineDark }} />
            {showReplies ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </button>
          {showReplies && (
            <div className="fade-in" style={{ marginTop: 10 }}>
              {replies.map((r) => (
                <div key={r.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Avatar username={r.author} size={21} />
                  <div style={{ flex: 1 }} onDoubleClick={() => { if (!(r.likes || []).includes(me)) likeIt(r.id); }}>
                    <div style={{ fontSize: 12.5, color: T.text }}>
                      <span style={{ fontWeight: 600 }}>{r.author}</span> {r.text}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 10, color: T.textDim, marginTop: 2 }}>
                      {timeAgo(r.date)}
                      <CommentAction author={r.author} kind="reply" id={r.id} onDelete={() => safety.actions.deleteComment(postId, comment.id, r.id)} />
                    </div>
                  </div>
                  {safety && <CommentHeart item={r} me={me} onToggle={() => likeIt(r.id)} small />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
