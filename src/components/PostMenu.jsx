import { useState } from "react";
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { T } from "../theme";
import { BottomSheet, ConfirmDialog, TextArea } from "./ui";
import { MoreMenu, useSafety } from "./Safety";

// The "···" on a post. Yours: edit caption, archive, delete, share.
// Someone else's: share, not interested, report, block.
export function PostMenu({ post, me, actions, onDeleted, overlay, carName }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [caption, setCaption] = useState(post.caption || "");
  const safety = useSafety();
  const mine = post.authorUsername === me;
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
        { label: "Edit caption", icon: <Pencil size={17} />, onClick: () => { setCaption(post.caption || ""); setEditing(true); } },
        post.archived
          ? { label: "Unarchive", icon: <ArchiveRestore size={17} />, onClick: () => actions.setArchived(post.id, false) }
          : { label: "Archive", icon: <Archive size={17} />, onClick: () => { actions.setArchived(post.id, true); onDeleted && onDeleted(); } },
        { label: "Delete", icon: <Trash2 size={17} />, danger: true, onClick: () => setConfirm(true) },
      ]} />

      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Edit caption" maxHeight="70vh">
        <TextArea value={caption} onChange={setCaption} maxLength={280} rows={4} autoFocus />
        <button onClick={async () => { await actions.editPost(post.id, caption); setEditing(false); }} className="press" style={{
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
