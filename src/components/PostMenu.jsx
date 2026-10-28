import { useState } from "react";
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { T } from "../theme";
import { BottomSheet, ConfirmDialog, TextArea } from "./ui";
import { MoreMenu, useSafety } from "./Safety";
import { MAX_LINES } from "../lib/text";

// The "···" on a post. Yours: edit caption, archive, delete, share.
// Someone else's: share, not interested, report, block.
export function PostMenu({ post, me, actions, onDeleted, overlay, carName }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [caption, setCaption] = useState(post.caption || "");
  const [carId, setCarId] = useState(post.carId || null);
  const safety = useSafety();
  const mine = post.authorUsername === me;
  const myCars = Object.values(safety?.cars || {}).filter((c) => c.ownerUsername === me);
  const share = { title: "Carfooly", text: `${post.authorUsername}${carName ? `'s ${carName}` : ""} on Carfooly${post.caption ? `: "${post.caption}"` : ""}` };

  if (!mine) {
    if (!safety) return null;
    return (
      <MoreMenu overlay={overlay} label="Post options" testid="post-menu" share={share} flash={safety.flash}
        hide={() => { safety.actions.hidePost(post.id); onDeleted && onDeleted(); }}
        report={{ what: "post", onSend: (reason, note) => safety.actions.report({ kind: "post", id: post.id, reason, note }) }}
        block={{ handle: post.authorUsername, blocked: safety.prefs.blocked.includes(post.authorUsername), onToggle: () => safety.actions.toggleBlock(post.authorUsername) }} />
    );
  }

  return (
    <>
      <MoreMenu overlay={overlay} label="Post options" testid="post-menu" share={share} flash={safety?.flash} items={[
        { label: "Edit post", icon: <Pencil size={17} />, onClick: () => { setCaption(post.caption || ""); setCarId(post.carId || null); setEditing(true); } },
        post.archived
          ? { label: "Unarchive", icon: <ArchiveRestore size={17} />, onClick: () => actions.setArchived(post.id, false) }
          : { label: "Archive", icon: <Archive size={17} />, onClick: () => { actions.setArchived(post.id, true); onDeleted && onDeleted(); } },
        { label: "Delete", icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
      ]} />

      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Edit post" maxHeight="80vh">
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 6 }}>Caption</div>
        <TextArea value={caption} onChange={setCaption} maxLength={280} maxLines={MAX_LINES.caption} rows={4} autoFocus />
        {myCars.length > 0 && (
          <>
            <div className="plate" style={{ fontSize: 10.5, color: T.textDim, margin: "10px 0 6px" }}>Car</div>
            <div data-testid="edit-car-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[{ id: null, label: "No car" }, ...myCars.map((c) => ({ id: c.id, label: c.nickname || `${c.make} ${c.model}` }))].map((c) => (
                <button key={c.id || "none"} onClick={() => setCarId(c.id)} className="press" style={{
                  padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                  border: `1px solid ${carId === c.id ? T.accent : T.lineDark}`, background: carId === c.id ? "rgba(230,56,70,0.14)" : "transparent", color: carId === c.id ? T.accent : T.text,
                }}>{c.label}</button>
              ))}
            </div>
          </>
        )}
        <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 10 }}>Photos can't be changed. People will see a small "edited".</div>
        <button data-testid="save-edit" onClick={async () => { await actions.editPost(post.id, caption, carId); setEditing(false); }} className="press" style={{
          width: "100%", marginTop: 12, padding: "13px 16px", borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15,
        }}>
          Save
        </button>
      </BottomSheet>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete this post?"
        body="It will be removed from the feed, your profile and the car's page. This can't be undone. (Tip: Archive hides it instead.)"
        onConfirm={async () => { await actions.deletePost(post.id); onDeleted && onDeleted(); }} />
    </>
  );
}
