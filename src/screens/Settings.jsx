import { useState } from "react";
import { User, Car, Archive, LogOut, Trash2, ChevronRight, Info, Pencil, Image as ImageIcon, Users, ShieldCheck, Globe, Type } from "lucide-react";
import { T } from "../theme";
import { fmtDate } from "../lib/utils";
import { Avatar, EmptyState, Field, TextInput, TextArea, ConfirmDialog, SectionLabel, BottomSheet, isDriver } from "../components/ui";
import { CameraCapture } from "../components/photo/CameraCapture";
import { REMOTE } from "../backend/config";
import { MAX_LINES } from "../lib/text";
import { tr, LANGS, lang , AT } from "../lib/i18n";
import { LanguageSettings } from "../components/LanguagePicker";
import { FontSettings } from "../components/FontPicker";

export const APP_VERSION = `0.2${import.meta.env?.VITE_BUILD ? `.${import.meta.env.VITE_BUILD}` : ".0"} beta`;

function Row({ icon, label, sub, onClick, danger, disabled, right }) {
  return (
    <button onClick={onClick} disabled={disabled} className="press" style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", border: "none",
      background: "transparent", color: danger ? T.accent : T.text, textAlign: "start", opacity: disabled ? 0.45 : 1,
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

export function SettingsScreen({ me, users, cars, posts, go, actions, onTour, isAdmin, openReports = 0 }) {
  const remote = REMOTE;
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheet, setSheet] = useState(null); // "language" | "fonts"
  const user = users[me] || {};
  const carCount = Object.values(cars).filter((c) => c.ownerUsername === me).length;
  const archivedCount = Object.values(posts).filter((p) => p.authorUsername === me && p.archived).length;

  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 16 }}>{tr("Settings")}</div>

      <button onClick={() => go("editProfile")} className="press" style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, marginBottom: 18,
        background: T.surface, border: `1px solid ${T.lineDark}`, textAlign: "start",
      }}>
        <Avatar username={me} size={52} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>{user.name || me}</div>
          <div className="plate handle" style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>{AT}{me}</div>
        </div>
        <Pencil size={15} color={T.textDim} />
      </button>

      <SectionLabel>{tr("Account")}</SectionLabel>
      <Group>
        <Row icon={<User size={16} />} label={tr("Edit profile")} sub={tr("Photo, name, bio")} onClick={() => go("editProfile")} />
        {(isDriver(user) || carCount > 0) && <Row icon={<Car size={16} />} label={tr("My cars")} sub={tr("{0} {1} · edit or delete", carCount, carCount === 1 ? tr("car") : tr("cars"))} onClick={() => go("manageCars")} />}
        {/* Chosen once when the account is made; it can't be changed (make a new account instead). */}
        <Row icon={<Users size={16} />} label={tr("Account type: {0}", tr({ personal: "Driver", club: "Club", business: "Business" }[user.accountType || "personal"]))} sub={tr("Set when the account was made")} disabled right={null} />
        <Row icon={<Archive size={16} />} label={tr("Archived posts")} sub={archivedCount ? tr("{0} hidden", archivedCount) : tr("None")} onClick={() => go("archive")} />
      </Group>

      {isAdmin && (
        <>
          <SectionLabel>{tr("Admin")}</SectionLabel>
          <Group>
            <Row icon={<ShieldCheck size={16} />} label={tr("Review reports")} sub={openReports ? tr("{0} open", openReports) : tr("Nothing to review")} onClick={() => go("reports")} />
          </Group>
        </>
      )}

      <SectionLabel>{tr("Sign-in")}</SectionLabel>
      <Group>
        <Row icon={<span style={{ fontWeight: 800, fontSize: 15 }}>G</span>} label={tr("Connect Google")} sub={tr("Coming soon")} disabled right={null} />
        <Row icon={<LogOut size={16} />} label={remote ? tr("Log out") : tr("Switch account / Log out")} sub={remote ? tr("Log in again with your email and password") : tr("Pick a different handle on this phone")} onClick={() => setConfirmLogout(true)} />
      </Group>

      <SectionLabel>{tr("App")}</SectionLabel>
      <Group>
        <Row icon={<Globe size={16} />} label={tr("Language")} sub={LANGS.find((l) => l.code === lang)?.native} onClick={() => setSheet("language")} />
        <Row icon={<Type size={16} />} label={tr("Fonts (testing)")} sub={tr("Try different fonts while we choose")} onClick={() => setSheet("fonts")} />
      </Group>

      <SectionLabel>{tr("Help")}</SectionLabel>
      <Group>
        <Row icon={<Info size={16} />} label={tr("How Carfooly works")} sub={tr("See the intro again")} onClick={onTour} />
      </Group>

      <Group>
        <Row icon={<Trash2 size={16} />} label={tr("Delete account")} sub={tr("Removes your profile, cars, posts and comments")} danger onClick={() => setConfirmDelete(true)} />
      </Group>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.textDim, fontSize: 12, marginTop: 4 }}>
        <Info size={12} /> {tr("Carfooly")} {APP_VERSION}{user.joinedAt ? tr(" · joined {0}", fmtDate(user.joinedAt)) : ""}
      </div>

      <BottomSheet open={sheet === "language"} onClose={() => setSheet(null)} title={tr("Language")}>
        <LanguageSettings />
      </BottomSheet>
      <BottomSheet open={sheet === "fonts"} onClose={() => setSheet(null)} title={tr("Fonts (testing)")} maxHeight="88vh">
        <FontSettings />
      </BottomSheet>

      <ConfirmDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} title={tr("Log out?")} confirmLabel={tr("Log out")}
        body={remote ? tr("Everything stays in your account. Log back in any time.") : tr("Your stuff stays on this phone. Log back in with the same handle to get it back.")} onConfirm={actions.logout} />
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={tr("Delete your account?")} confirmLabel={tr("Delete everything")}
        body={tr("This removes your profile, cars, posts, comments, likes and spots. It can't be undone.")} onConfirm={actions.deleteAccount} />
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
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 18 }}>{tr("Edit profile")}</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: 96, height: 96, borderRadius: 999, objectFit: "cover" }} />
          : <Avatar username={me} size={96} />}
        <div style={{ display: "flex", gap: 8 }}>
          <AvatarPicker onPick={setAvatar} />
          {avatar && (
            <button onClick={() => setAvatar(null)} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.textDim, fontSize: 12.5, fontWeight: 600 }}>
              {tr("Remove")}
            </button>
          )}
        </div>
      </div>

      <Field label={tr("Name")}><TextInput value={name} onChange={setName} placeholder={tr("Your name")} maxLength={40} /></Field>
      <Field label={tr("Handle")}>
        <div style={{ padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, color: T.textDim, fontSize: 14.5 }}>{AT}{me}</div>
        <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 6 }}>{tr("Handles can't be changed yet.")}</div>
      </Field>
      <Field label={tr("Bio")}><TextArea value={bio} onChange={setBio} placeholder={tr("Your cars, your scene, your plans")} maxLength={150} maxLines={MAX_LINES.bio} rows={3} /></Field>

      <button disabled={busy} className="press" onClick={async () => { setBusy(true); await onSave({ name, bio, avatar }); setBusy(false); }} style={{
        width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", marginTop: 6, background: T.accent, color: "#fff", fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1,
      }}>
        {busy ? tr("Saving…") : tr("Save")}
      </button>
    </div>
  );
}

// Square-crops the chosen photo to a small circle-ready avatar.
export function AvatarPicker({ onPick }) {
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
        <CameraCapture value={null} allowLibrary label={tr("Choose a profile photo")} onChange={async (src) => { onPick(await crop(src)); setOpen(false); }} />
      </div>
    );
  }
  return (
    <button onClick={() => setOpen(true)} className="press" style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "rgba(230,56,70,0.14)", color: T.accent, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
      <ImageIcon size={13} /> {tr("Change photo")}
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
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 16 }}>{tr("My cars")}</div>
      {mine.length === 0 ? (
        <EmptyState icon={<Car size={20} color={T.textDim} />} title={tr("No cars yet")} body={tr("Cars you add show up here.")} />
      ) : (
        <Group>
          {mine.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? `1px solid ${T.lineDark}` : "none" }}>
              <button onClick={() => onOpen(c.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, textAlign: "start" }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: c.photoUrl ? `url(${c.photoUrl}) center/cover` : T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {!c.photoUrl && <Car size={18} color={T.textDim} />}
                </div>
                <div>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{c.nickname || `${c.make} ${c.model}`}</div>
                  <div className="plate" style={{ color: T.textDim, fontSize: 10.5, marginTop: 2 }}>{c.year} · {c.make} {c.model}{c.hasPage === false ? tr(" · no page") : ""}</div>
                </div>
              </button>
              <button aria-label={tr("Edit car")} onClick={() => onEdit(c.id)} className="press" style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Pencil size={14} color={T.text} />
              </button>
              <button aria-label={tr("Delete car")} onClick={() => setDeleting(c.id)} className="press" style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={14} color={T.accent} />
              </button>
            </div>
          ))}
        </Group>
      )}
      <ConfirmDialog open={!!target} onClose={() => setDeleting(null)}
        title={target ? tr("Delete {0}?", target.nickname || `${target.make} ${target.model}`) : ""}
        body={target ? tr("Its page and build log will be gone.{0} This can't be undone.", postCount(target.id) ? tr(" Your {0} post{1} about it stay, without the car tag.", postCount(target.id), postCount(target.id) === 1 ? "" : "s") : "") : ""}
        onConfirm={() => onDelete(deleting)} />
    </div>
  );
}

export function ArchivedPosts({ me, posts, openPost, onRestore }) {
  const list = Object.values(posts).filter((p) => p.authorUsername === me && p.archived).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div style={{ paddingTop: 18, paddingBottom: 10 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 4 }}>{tr("Archived posts")}</div>
      <div style={{ fontSize: 13.5, color: T.textDim, marginBottom: 16 }}>{tr("Only you can see these. Restore one to put it back on your profile and the feed.")}</div>
      {list.length === 0 ? (
        <EmptyState icon={<Archive size={20} color={T.textDim} />} title={tr("Nothing archived")} body={tr("Use the ··· menu on a post to archive it.")} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {list.map((p) => (
            <div key={p.id} style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 16, overflow: "hidden" }}>
              <button onClick={() => openPost(p.id)} style={{ width: "100%", aspectRatio: "1", border: "none", padding: 0, background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!p.photoUrl && <span style={{ color: T.textDim, fontSize: 12, padding: 10 }}>{p.caption || tr("Post")}</span>}
              </button>
              <button onClick={() => onRestore(p.id)} className="press" style={{ width: "100%", padding: "9px", border: "none", background: "transparent", color: T.accent, fontSize: 12.5, fontWeight: 600 }}>
                {tr("Restore")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
