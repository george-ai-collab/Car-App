import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { T } from "../theme";
import { ActionMenu, BottomSheet, ConfirmDialog, TextArea } from "./ui";

// The "..." button on your own posts: edit caption, archive, delete.
export function PostMenu({ post, me, actions, onDeleted, overlay }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [caption, setCaption] = useState(post.caption || "");
  if (post.authorUsername !== me) return null;

  return (
    <>
      <button aria-label="Post options" data-testid="post-menu" onClick={(e) => { e.stopPropagation(); setMenu(true); }} className="press" style={overlay
        ? { width: 52, height: 32, background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }
        : { background: "rgba(255,255,255,0.06)", border: "none", padding: 7, borderRadius: 999, display: "flex" }}>
        <MoreHorizontal size={overlay ? 28 : 18} color={overlay ? "#fff" : T.text} style={overlay ? { filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" } : undefined} />
      </button>

      <ActionMenu open={menu} onClose={() => setMenu(false)} items={[
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
