import { useState } from "react";
import { User, Car, Archive, LogOut, Trash2, ChevronRight, Info, Pencil, Image as ImageIcon } from "lucide-react";
import { T } from "../theme";
import { fmtDate } from "../lib/utils";
import { Avatar, EmptyState, Field, TextInput, TextArea, ConfirmDialog, SectionLabel } from "../components/ui";
import { CameraCapture } from "../components/photo/CameraCapture";

export const APP_VERSION = "0.2.0 beta";

function Row({ icon, label, sub, onClick, danger, disabled, right }) {
  return (
    <button onClick={onClick} disabled={disabled} className="press" style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", border: "none",
      background: "transparent", color: danger ? T.accent : T.text, textAlign: "left", opacity: disabled ? 0.45 : 1,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 11, background: danger ? "rgba(230,56,70,0.14)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
      {right !== undefined ? right : !disabled && <ChevronRight size={16} color={T.textDim} />}
    </button>
  );
}

function Group({ children }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, overflow: "hidden", marginBottom: 18 }}>
      {children}
    </div>
  );
}

export function SettingsScreen({ me, users, cars, posts, go, actions }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const user = users[me] || {};
  const carCount = Object.values(cars).filter((c) => c.ownerUsername === me).length;
  const archivedCount = Object.values(posts).filter((p) => p.authorUsername === me && p.archived).length;

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 16 }}>Settings</div>

      <button onClick={() => go("editProfile")} className="press" style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, marginBottom: 18,
        background: T.surface, border: `1px solid ${T.lineDark}`, textAlign: "left",
      }}>
        <Avatar username={me} size={52} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>{user.name || me}</div>
          <div className="plate" style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>@{me}</div>
        </div>
        <Pencil size={15} color={T.textDim} />
      </button>

      <SectionLabel>Account</SectionLabel>
      <Group>
        <Row icon={<User size={16} />} label="Edit profile" sub="Photo, name, bio" onClick={() => go("editProfile")} />
        <Row icon={<Car size={16} />} label="My cars" sub={`${carCount} ${carCount === 1 ? "car" : "cars"} · edit or delete`} onClick={() => go("manageCars")} />
        <Row icon={<Archive size={16} />} label="Archived posts" sub={archivedCount ? `${archivedCount} hidden` : "None"} onClick={() => go("archive")} />
      </Group>

      <SectionLabel>Sign-in</SectionLabel>
      <Group>
        <Row icon={<span style={{ fontWeight: 800, fontSize: 15 }}>G</span>} label="Connect Google" sub="Comes with online accounts (next update)" disabled right={null} />
        <Row icon={<LogOut size={16} />} label="Switch account / Log out" sub="Pick a different handle on this phone" onClick={() => setConfirmLogout(true)} />
      </Group>

      <Group>
        <Row icon={<Trash2 size={16} />} label="Delete account" sub="Removes your profile, cars, posts and comments" danger onClick={() => setConfirmDelete(true)} />
      </Group>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.textDim, fontSize: 12, marginTop: 4 }}>
        <Info size={12} /> Carfooly {APP_VERSION}{user.joinedAt ? ` · joined ${fmtDate(user.joinedAt)}` : ""}
      </div>

      <ConfirmDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Log out?" confirmLabel="Log out"
        body="Your stuff stays on this phone. Log back in with the same handle to get it back." onConfirm={actions.logout} />
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?" confirmLabel="Delete everything"
        body="This removes your profile, cars, posts, comments, likes and spots. It can't be undone." onConfirm={actions.deleteAccount} />
    </div>
  );
}

export function EditProfile({ me, users, onSave }) {
  const user = users[me] || {};
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 18 }}>Edit profile</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: 96, height: 96, borderRadius: 999, objectFit: "cover" }} />
          : <Avatar username={me} size={96} />}
        <div style={{ display: "flex", gap: 8 }}>
          <AvatarPicker onPick={setAvatar} />
          {avatar && (
            <button onClick={() => setAvatar(null)} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.textDim, fontSize: 12.5, fontWeight: 600 }}>
              Remove
            </button>
          )}
        </div>
      </div>

      <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Your name" maxLength={40} /></Field>
      <Field label="Handle">
        <div style={{ padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, color: T.textDim, fontSize: 14.5 }}>@{me}</div>
        <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 6 }}>Handles can't be changed yet.</div>
      </Field>
      <Field label="Bio"><TextArea value={bio} onChange={setBio} placeholder="Your cars, your scene, your plans" maxLength={150} rows={3} /></Field>

      <button disabled={busy} className="press" onClick={async () => { setBusy(true); await onSave({ name, bio, avatar }); setBusy(false); }} style={{
        width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 6, background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1,
      }}>
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

// Square-crops the chosen photo to a small circle-ready avatar.
function AvatarPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const crop = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = 320; canvas.height = 320;
      canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 320, 320);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
  if (open) {
    return (
      <div style={{ width: 220 }}>
        <CameraCapture value={null} allowLibrary label="Choose a profile photo" onChange={async (src) => { onPick(await crop(src)); setOpen(false); }} />
      </div>
    );
  }
  return (
    <button onClick={() => setOpen(true)} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "rgba(230,56,70,0.14)", color: T.accent, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
      <ImageIcon size={13} /> Change photo
    </button>
  );
}

export function ManageCars({ me, cars, posts, onEdit, onDelete, onOpen }) {
  const [deleting, setDeleting] = useState(null);
  const mine = Object.values(cars).filter((c) => c.ownerUsername === me).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const postCount = (id) => Object.values(posts).filter((p) => p.carId === id).length;
  const target = deleting && cars[deleting];

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 16 }}>My cars</div>
      {mine.length === 0 ? (
        <EmptyState icon={<Car size={20} color={T.textDim} />} title="No cars yet" body="Cars you add show up here." />
      ) : (
        <Group>
          {mine.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? `1px solid ${T.lineDark}` : "none" }}>
              <button onClick={() => onOpen(c.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, textAlign: "left" }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: c.photoUrl ? `url(${c.photoUrl}) center/cover` : T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {!c.photoUrl && <Car size={18} color={T.textDim} />}
                </div>
                <div>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{c.nickname || `${c.make} ${c.model}`}</div>
                  <div className="plate" style={{ color: T.textDim, fontSize: 10.5, marginTop: 2 }}>{c.year} · {c.make} {c.model}{c.hasPage === false ? " · no page" : ""}</div>
                </div>
              </button>
              <button aria-label="Edit car" onClick={() => onEdit(c.id)} className="press" style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Pencil size={14} color={T.text} />
              </button>
              <button aria-label="Delete car" onClick={() => setDeleting(c.id)} className="press" style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={14} color={T.accent} />
              </button>
            </div>
          ))}
        </Group>
      )}
      <ConfirmDialog open={!!target} onClose={() => setDeleting(null)}
        title={target ? `Delete ${target.nickname || `${target.make} ${target.model}`}?` : ""}
        body={target ? `Its page and build log will be gone.${postCount(target.id) ? ` Your ${postCount(target.id)} post${postCount(target.id) === 1 ? "" : "s"} about it stay, without the car tag.` : ""} This can't be undone.` : ""}
        onConfirm={() => onDelete(deleting)} />
    </div>
  );
}

export function ArchivedPosts({ me, posts, openPost, onRestore }) {
  const list = Object.values(posts).filter((p) => p.authorUsername === me && p.archived).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>Archived posts</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 16 }}>Only you can see these. Restore one to put it back on your profile and the feed.</div>
      {list.length === 0 ? (
        <EmptyState icon={<Archive size={20} color={T.textDim} />} title="Nothing archived" body="Use the ··· menu on a post to archive it." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {list.map((p) => (
            <div key={p.id} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, overflow: "hidden" }}>
              <button onClick={() => openPost(p.id)} style={{ width: "100%", aspectRatio: "1", border: "none", padding: 0, background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!p.photoUrl && <span style={{ color: T.textDim, fontSize: 12, padding: 10 }}>{p.caption || "Post"}</span>}
              </button>
              <button onClick={() => onRestore(p.id)} className="press" style={{ width: "100%", padding: "9px", border: "none", background: "transparent", color: T.accent, fontSize: 12.5, fontWeight: 600 }}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
