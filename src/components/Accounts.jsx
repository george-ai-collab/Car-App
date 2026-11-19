// Account things: switching between saved accounts, changing your password or handle,
// picking a handle after signing up with Google, and setting a new password from an email link.
import { useEffect, useState } from "react";
import { Check, Plus, AtSign, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";
import { T } from "../theme";
import { tr, AT } from "../lib/i18n";
import { BottomSheet } from "./ui";
import { Avatar } from "./ui";
import { listAccounts, MAX_ACCOUNTS } from "../lib/accounts";
import { handleProblem } from "../lib/moderation";

const HANDLE_RE = /^[a-z0-9_.]{2,24}$/;
const HANDLE_MSG = {
  taken: "Taken. Try another.", reserved: "That handle is reserved. Try another.", not_allowed: "That handle isn't allowed. Try another.",
  invalid: "2–24 lowercase letters, numbers, _ or .", too_soon: "You can change your handle once every 30 days.",
};
const btn = (on) => ({ width: "100%", padding: 13, borderRadius: 16, border: "none", background: on ? T.accent : T.surface2, color: on ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 });

// The accounts on this phone. Tap one to switch; the others stay signed in.
export function AccountSwitcher({ open, onClose, myId, actions }) {
  const list = open ? listAccounts() : [];
  const full = list.length >= MAX_ACCOUNTS;
  return (
    <BottomSheet open={open} onClose={onClose} title={tr("Accounts")} maxHeight="70vh">
      <div data-testid="account-switcher">
        {list.map((a) => (
          <button key={a.id} data-testid="switch-account" disabled={a.id === myId} onClick={async () => { onClose(); await actions.switchAccount(a.id); }} className="press"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", background: "none", border: "none", borderBottom: `1px solid ${T.lineDark}`, textAlign: "start" }}>
            {a.avatar ? <img src={a.avatar} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} /> : <Avatar username={a.handle} size={40} />}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", color: T.text, fontSize: 15, fontWeight: 700 }}>{a.name || a.handle}</span>
              <span className="plate handle" style={{ display: "block", color: T.textDim, fontSize: 10.5 }}>{AT}{a.handle}</span>
            </span>
            {a.id === myId ? <Check size={18} color={T.accent} /> : <ChevronRight size={16} color={T.textDim} />}
          </button>
        ))}
        <button data-testid="add-account" disabled={full} onClick={() => { onClose(); actions.addAccount(); }} className="press"
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", background: "none", border: "none", textAlign: "start", opacity: full ? 0.5 : 1 }}>
          <span style={{ width: 40, height: 40, borderRadius: 999, border: `1.5px dashed ${T.lineDark}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} color={T.text} /></span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", color: T.text, fontSize: 15, fontWeight: 700 }}>{tr("Add account")}</span>
            <span style={{ display: "block", color: T.textDim, fontSize: 11.5 }}>{full ? tr("Up to {0} accounts on one phone", MAX_ACCOUNTS) : tr("Log in or make a new one; this one stays signed in")}</span>
          </span>
        </button>
        <div style={{ color: T.textDim, fontSize: 11.5, marginTop: 8, textAlign: "center" }}>{tr("Tip: double-tap Profile in the bar below to switch quickly.")}</div>
      </div>
    </BottomSheet>
  );
}

function Pass({ value, onChange, label, testid, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 6 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <Lock size={15} color={T.textDim} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
        <input data-testid={testid} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} maxLength={72} autoComplete={autoComplete}
          style={{ width: "100%", padding: "12px 44px 12px 38px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 15, outline: "none" }} />
        <button type="button" aria-label={show ? tr("Hide password") : tr("Show password")} onClick={() => setShow((x) => !x)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textDim, display: "flex", padding: 4 }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

// Change (or, for Google-only accounts, set) your password.
export function PasswordSheet({ open, onClose, actions, flash, hasPassword }) {
  const [cur, setCur] = useState(""), [next, setNext] = useState(""), [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  useEffect(() => { if (open) { setCur(""); setNext(""); setAgain(""); setErr(null); } }, [open]);
  const ok = (!hasPassword || cur) && next.length >= 8 && next === again;
  const hint = next && next.length < 8 ? tr("At least 8 characters") : again && next !== again ? tr("The two new passwords don't match") : null;
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await actions.changePassword({ current: cur, next });
    setBusy(false);
    if (r?.error) { setErr(r.error); return; }
    flash(tr("Password changed")); onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={hasPassword ? tr("Change password") : tr("Set a password")} maxHeight="80vh">
      <div data-testid="password-sheet">
        {!hasPassword && <div style={{ color: T.textDim, fontSize: 12.5, marginBottom: 12 }}>{tr("You sign in with Google. Add a password to also log in with your email or handle.")}</div>}
        {hasPassword && <Pass value={cur} onChange={setCur} label={tr("Current password")} testid="pw-current" autoComplete="current-password" />}
        <Pass value={next} onChange={setNext} label={tr("New password")} testid="pw-new" autoComplete="new-password" />
        <Pass value={again} onChange={setAgain} label={tr("New password again")} testid="pw-again" autoComplete="new-password" />
        {(err || hint) && <div data-testid="pw-error" style={{ color: T.accent, fontSize: 12.5, margin: "0 2px 12px" }}>{err || hint}</div>}
        <button data-testid="pw-save" disabled={!ok || busy} onClick={save} className="press" style={btn(ok && !busy)}>{busy ? tr("Saving…") : tr("Save password")}</button>
      </div>
    </BottomSheet>
  );
}

// Typing a handle with a live "available?" check.
function HandleField({ value, onChange, status }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ position: "relative" }}>
        <AtSign size={15} color={T.textDim} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
        <input data-testid="handle-input" value={value} onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} maxLength={24} autoCapitalize="none" autoCorrect="off"
          style={{ width: "100%", padding: "12px 14px 12px 36px", borderRadius: 14, border: `1px solid ${status ? (status.bad ? "rgba(212,67,77,0.6)" : "rgba(123,211,137,0.5)") : T.lineDark}`, background: T.surface, color: T.text, fontSize: 15, outline: "none" }} />
      </div>
      {status && <div data-testid="handle-status" style={{ fontSize: 11.5, marginTop: 5, color: status.bad ? T.accent : "#8FBF9A" }}>{status.text}</div>}
    </div>
  );
}
function useHandleCheck(value, current, checkHandle) {
  const [st, setSt] = useState({});
  const clean = value.trim();
  const valid = HANDLE_RE.test(clean);
  useEffect(() => {
    if (!valid || clean === current || clean in st) return;
    const t = setTimeout(async () => { const r = await checkHandle(clean); setSt((x) => ({ ...x, [clean]: r })); }, 350);
    return () => clearTimeout(t);
  }, [clean, valid]); // eslint-disable-line react-hooks/exhaustive-deps
  const local = valid ? handleProblem(clean) : null;
  const res = !clean || clean === current ? null : !valid ? "invalid" : local || st[clean];
  const status = !res ? null : res === "ok" ? { bad: false, text: tr("Available") } : { bad: true, text: tr(HANDLE_MSG[res] || "Taken. Try another.") };
  return { clean, ok: res === "ok", status, mark: (r) => setSt((x) => ({ ...x, [clean]: r })) };
}

// Change your handle: free ones only, once every 30 days.
export function HandleSheet({ open, onClose, me, actions, lastChanged }) {
  const [v, setV] = useState(me);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setV(me); }, [open, me]);
  const { clean, ok, status, mark } = useHandleCheck(v, me, actions.checkHandle);
  const nextFree = lastChanged ? new Date(new Date(lastChanged).getTime() + 30 * 864e5) : null;
  const waiting = nextFree && nextFree > new Date();
  const save = async () => {
    setBusy(true);
    const r = await actions.changeHandle(clean);
    setBusy(false);
    if (r === "ok") onClose(); else mark(r || "invalid");
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={tr("Change your handle")} maxHeight="80vh">
      <div data-testid="handle-sheet">
        <HandleField value={v} onChange={setV} status={status} />
        <div style={{ color: T.textDim, fontSize: 12, lineHeight: 1.5, margin: "6px 2px 14px" }}>
          {waiting ? tr("You changed it recently. You can change it again on {0}.", nextFree.toLocaleDateString()) : tr("You can change it once every 30 days. Your old handle is held for 30 days so nobody can pretend to be you. Old @mentions of you won't update.")}
        </div>
        <button data-testid="handle-save" disabled={!ok || busy || waiting} onClick={save} className="press" style={btn(ok && !busy && !waiting)}>{busy ? tr("Saving…") : tr("Change handle")}</button>
      </div>
    </BottomSheet>
  );
}

// After signing up with Google: pick the handle people will see.
export function PickHandleScreen({ suggestion, actions }) {
  const [v, setV] = useState((suggestion || "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24));
  const [busy, setBusy] = useState(false);
  const { clean, ok, status, mark } = useHandleCheck(v, null, actions.checkHandle);
  const save = async () => { setBusy(true); const r = await actions.changeHandle(clean); setBusy(false); if (r !== "ok") mark(r || "invalid"); };
  return (
    <div data-testid="pick-handle" style={{ minHeight: "100vh", padding: "calc(60px + var(--inset-top)) 22px 30px", maxWidth: 460, margin: "0 auto" }}>
      <div className="display" style={{ fontSize: 26, color: T.text }}>{tr("Pick your handle")}</div>
      <div style={{ color: T.textDim, fontSize: 13.5, lineHeight: 1.5, margin: "8px 0 20px" }}>{tr("It's how people find and tag you, like @george_q. Lowercase letters, numbers, _ and .")}</div>
      <HandleField value={v} onChange={setV} status={status} />
      <div style={{ height: 14 }} />
      <button data-testid="pick-handle-save" disabled={!ok || busy} onClick={save} className="press" style={btn(ok && !busy)}>{busy ? tr("Saving…") : tr("Continue")} <ChevronRight size={16} /></button>
      <button onClick={actions.logout} style={{ width: "100%", background: "none", border: "none", color: T.textDim, fontSize: 12.5, marginTop: 14 }}>{tr("Not you? Log out")}</button>
    </div>
  );
}

// Opened from a "reset password" email link: you're signed in, now pick the new password.
export function NewPasswordSheet({ open, actions, flash }) {
  const [next, setNext] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  const ok = next.length >= 8;
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await actions.changePassword({ next, fromLink: true });
    setBusy(false);
    if (r?.error) { setErr(r.error); return; }
    flash(tr("Password changed")); actions.endRecovery();
  };
  return (
    <BottomSheet open={open} onClose={actions.endRecovery} title={tr("Set a new password")} maxHeight="70vh">
      <Pass value={next} onChange={setNext} label={tr("New password")} testid="pw-new" autoComplete="new-password" />
      {err && <div style={{ color: T.accent, fontSize: 12.5, margin: "0 2px 12px" }}>{err}</div>}
      <button disabled={!ok || busy} onClick={save} className="press" style={btn(ok && !busy)}>{busy ? tr("Saving…") : tr("Save password")}</button>
    </BottomSheet>
  );
}
