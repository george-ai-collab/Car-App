// Accounts saved on this phone, so you can hop between them (double-tap Profile).
// Online, each one keeps its own sign-in, so switching doesn't need the password again.
// Switching never logs the other accounts out; only "Log out" does.
import { REMOTE } from "../backend/config";
import { sb } from "../backend/client";

const KEY = "lacerta-accounts";
export const MAX_ACCOUNTS = 5;

export function listAccounts() {
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(l) ? l.filter((a) => a && a.id && a.handle) : [];
  } catch { return []; }
}
const write = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, MAX_ACCOUNTS))); } catch { /* storage full or blocked */ } };

// Put this account first in the list (it's the one in use), with its sign-in if we have it.
export function rememberAccount({ id, handle, name, avatar }, session) {
  const list = listAccounts();
  const prev = list.find((a) => a.id === id) || {};
  const tokens = session ? { access: session.access_token, refresh: session.refresh_token } : { access: prev.access, refresh: prev.refresh };
  write([{ id, handle, name: name || handle, avatar: avatar || null, ...tokens }, ...list.filter((a) => a.id !== id)]);
}
export function forgetAccount(id) { write(listAccounts().filter((a) => a.id !== id)); }
// The sign-in went stale (signed out somewhere else): keep the account listed, ask for the password.
export function dropTokens(id) { write(listAccounts().map((a) => (a.id === id ? { ...a, access: null, refresh: null } : a))); }
export const otherAccounts = (myId) => listAccounts().filter((a) => a.id !== myId);
export const canAddAccount = () => listAccounts().length < MAX_ACCOUNTS;

// Sign-ins refresh themselves every hour; keep the saved copy current.
let tracking = false;
export function trackSignIns() {
  if (!REMOTE || tracking) return;
  tracking = true;
  try {
    sb().auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      const list = listAccounts();
      const a = list.find((x) => x.id === session.user.id);
      if (!a || a.refresh === session.refresh_token) return;
      a.access = session.access_token; a.refresh = session.refresh_token;
      write(list);
    });
  } catch { /* no backend */ }
}
