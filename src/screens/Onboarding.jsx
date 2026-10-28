import { useEffect, useState } from "react";
import { Car, AtSign, User, ChevronRight, Check, Mail, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { T } from "../theme";
import { Avatar } from "../components/ui";
import { useKeyboardOffset } from "../lib/keyboard";
import { findBanned, handleProblem } from "../lib/moderation";

const HANDLE_MSG = {
  taken: "Taken. Try another.",
  reserved: "That handle is reserved. Try another.",
  not_allowed: "That handle isn't allowed. Try another.",
};

// Sign up / log in. Same look as the rest of the app: dark, red accent, glass card.
// Online: email + password accounts. (Test builds without a backend keep accounts on the phone.)
export function Onboarding({ onSubmit, users = {}, remote, actions }) {
  return remote ? <OnlineOnboarding actions={actions} /> : <LocalOnboarding onSubmit={onSubmit} users={users} />;
}

function LocalOnboarding({ onSubmit, users }) {
  const known = Object.entries(users).filter(([, u]) => u && u.name).slice(0, 6);
  const [mode, setMode] = useState(known.length ? "login" : "create");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = handle.trim().toLowerCase();
  const valid = /^[a-z0-9_.]{2,24}$/.test(clean);
  const problem = mode === "create" && valid ? (users[clean] ? "taken" : handleProblem(clean)) : null;
  const taken = !!problem;
  const canCreate = valid && !taken && displayName.trim();

  const go = async (h, name) => { setBusy(true); await onSubmit(h, name); setBusy(false); };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 22px" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 55% at 50% 0%, rgba(230,56,70,0.28), rgba(10,10,11,0) 70%), radial-gradient(60% 40% at 100% 100%, rgba(69,123,144,0.18), rgba(10,10,11,0) 70%)" }} />
      <div style={{ position: "relative", maxWidth: 400, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: `linear-gradient(150deg, ${T.accent}, ${T.accentDeep})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(230,56,70,0.45)" }}>
            <Car size={36} color="#fff" />
          </div>
          <div className="display" style={{ fontSize: 34, color: T.text, marginTop: 16, letterSpacing: "0.04em" }}>CARFOOLY</div>
          <div style={{ color: T.textDim, fontSize: 14.5, marginTop: 6 }}>Every car has a story. This is where it lives.</div>
        </div>

        <div className="glass" style={{ borderRadius: 26, padding: 18 }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: 4, marginBottom: 18 }}>
            {[["create", "Create account"], ["login", "Log in"]].map(([id, label]) => (
              <button key={id} data-testid={`mode-${id}`} onClick={() => setMode(id)} className="press" style={{
                flex: 1, padding: "9px 0", borderRadius: 999, border: "none", fontSize: 13.5, fontWeight: 700,
                background: mode === id ? "rgba(255,255,255,0.92)" : "transparent", color: mode === id ? T.ink : T.textDim,
              }}>{label}</button>
            ))}
          </div>

          {mode === "create" ? (
            <>
              <Input icon={<User size={16} />} value={displayName} onChange={setDisplayName} placeholder="e.g. George Q" label="Your name" maxLength={40} />
              <Input icon={<AtSign size={16} />} value={handle} onChange={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="e.g. george_q" label="Handle" maxLength={24}
                status={!clean ? null : taken ? { bad: true, text: problem === "taken" ? "Taken. Try another, or log in." : HANDLE_MSG[problem] } : !valid ? { bad: true, text: "2–24 characters" } : { bad: false, text: "Available" }} />
              <div style={{ fontSize: 11.5, color: T.textDim, margin: "-4px 2px 16px" }}>Lowercase letters, numbers, _ and . only. Handles can't be changed later.</div>
              <button disabled={!canCreate || busy} onClick={() => go(clean, displayName)} className="press" style={primary(canCreate)}>
                {busy ? "Setting up…" : "Enter Carfooly"} <ChevronRight size={17} />
              </button>
            </>
          ) : (
            <>
              {known.length > 0 && (
                <>
                  <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 10 }}>Accounts on this phone</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {known.map(([h, u]) => (
                      <button key={h} data-testid="known-account" disabled={busy} onClick={() => go(h, u.name || "")} className="press" style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 18, background: "rgba(255,255,255,0.05)", border: `1px solid ${T.lineDark}`, textAlign: "left",
                      }}>
                        <Avatar username={h} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>{u.name}</div>
                          <div className="plate handle" style={{ color: T.textDim, fontSize: 10.5 }}>@{h}</div>
                        </div>
                        <ChevronRight size={16} color={T.textDim} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              <Input icon={<AtSign size={16} />} value={handle} onChange={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="your handle" label="Handle" maxLength={24}
                status={clean && valid && !users[clean] ? { bad: true, text: "No account with that handle on this phone" } : null} />
              <button disabled={!users[clean] || busy} onClick={() => go(clean, users[clean]?.name || "")} className="press" style={primary(!!users[clean])}>
                Log in <ChevronRight size={17} />
              </button>
            </>
          )}
        </div>

        <div style={{ color: T.textDim, fontSize: 11.5, textAlign: "center", lineHeight: 1.5, marginTop: 16, padding: "0 10px" }}>
          Beta: your account and posts are saved on this phone for now. Online accounts with email and Google sign-in are coming next.
        </div>
      </div>
    </div>
  );
}

// With the keyboard open, the page gets room below the form and the box you're typing in
// is moved into view, so nothing hides behind the keyboard.
function Frame({ children, note }) {
  const kb = useKeyboardOffset(); // (the box you type in is moved above the keyboard by lib/keyboard)
  return (
    <div data-testid="auth-page" style={{ minHeight: "100vh", position: "relative", overflowX: "clip", display: "flex", flexDirection: "column", justifyContent: kb ? "flex-start" : "center", padding: `${kb ? 24 : 40}px 22px ${kb + 40}px` }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(90% 55% at 50% 0%, rgba(230,56,70,0.28), rgba(10,10,11,0) 70%), radial-gradient(60% 40% at 100% 100%, rgba(69,123,144,0.18), rgba(10,10,11,0) 70%)" }} />
      <div style={{ position: "relative", maxWidth: 400, width: "100%", margin: "0 auto" }}>
        {!kb && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, borderRadius: 24, background: `linear-gradient(150deg, ${T.accent}, ${T.accentDeep})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(230,56,70,0.45)" }}>
              <Car size={36} color="#fff" />
            </div>
            <div className="display" style={{ fontSize: 34, color: T.text, marginTop: 16, letterSpacing: "0.04em" }}>CARFOOLY</div>
            <div style={{ color: T.textDim, fontSize: 14.5, marginTop: 6 }}>Every car has a story. This is where it lives.</div>
          </div>
        )}
        <div className="glass" style={{ borderRadius: 26, padding: 18 }}>{children}</div>
        {note && <div style={{ color: T.textDim, fontSize: 11.5, textAlign: "center", lineHeight: 1.5, marginTop: 16, padding: "0 10px" }}>{note}</div>}
      </div>
    </div>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function OnlineOnboarding({ actions }) {
  const [mode, setMode] = useState("create");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [free, setFree] = useState({}); // handle -> "ok" | "taken" | "reserved" | "not_allowed" | null (unknown)

  const clean = handle.trim().toLowerCase();
  const valid = /^[a-z0-9_.]{2,24}$/.test(clean);
  const emailOk = EMAIL.test(email.trim());
  const passOk = password.length >= 8;

  // Check the handle a moment after typing stops.
  useEffect(() => {
    if (mode !== "create" || !valid || clean in free) return;
    const t = setTimeout(async () => {
      const st = await actions.checkHandle(clean);
      setFree((f) => ({ ...f, [clean]: st }));
    }, 350);
    return () => clearTimeout(t);
  }, [clean, valid, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const st = valid ? (handleProblem(clean) || free[clean]) : null; // instant local check, then the database
  const taken = valid && !!st && st !== "ok";
  const nameBad = !!findBanned(displayName);
  const canCreate = valid && !taken && displayName.trim() && !nameBad && emailOk && passOk;
  const loginId = email.trim().replace(/^@/, "");
  const canLogin = (emailOk || /^[a-zA-Z0-9_.]{2,24}$/.test(loginId)) && password.length > 0;
  const switchMode = (m) => { setMode(m); setError(null); setInfo(null); };

  const run = async (fn) => {
    setBusy(true); setError(null); setInfo(null);
    try {
      const res = await fn();
      if (res?.error) setError(res.error);
      else if (res?.needsConfirm) { setInfo("Almost there: we sent you an email. Tap the link in it, then log in here."); setMode("login"); }
    } catch { setError("No connection. Check your internet and try again."); }
    setBusy(false);
  };
  const create = () => run(async () => {
    const res = await actions.signUp({ email, password, handle: clean, name: displayName });
    if (res?.error && res.error.includes("handle")) setFree((f) => ({ ...f, [clean]: "taken" }));
    return res;
  });
  const login = () => run(() => actions.signIn({ email, password }));
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const sendCode = () => {
    if (!emailOk) { setError("Type your email first."); return; }
    run(async () => {
      const res = await actions.resetPassword(email);
      if (!res?.error) { setCodeSent(true); setInfo("If that email has an account, a code is on its way. It can take a minute; check spam too."); }
      return res;
    });
  };
  const codeOk = /^\d{6,10}$/.test(code.trim());
  const setNewPassword = () => run(() => actions.confirmReset({ email, code, password }));

  const handleStatus = !clean ? null : !valid ? { bad: true, text: "2–24 characters" }
    : taken ? { bad: true, text: HANDLE_MSG[st] || "Taken. Try another." } : st === "ok" ? { bad: false, text: "Available" } : null;
  const passField = (
    <Input icon={<Lock size={16} />} value={password} onChange={setPassword} placeholder={mode === "login" ? "Your password" : "At least 8 characters"} label={mode === "reset" ? "New password" : "Password"} maxLength={72}
      type={show ? "text" : "password"} testid="password"
      trailing={<button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((x) => !x)} style={{ background: "none", border: "none", color: T.textDim, display: "flex", padding: 4 }}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
      status={mode !== "login" && password && !passOk ? { bad: true, text: "At least 8 characters" } : null} />
  );

  return (
    <Frame note="Beta: you're one of the first drivers here. Your account works on any phone you sign in on.">
      {mode !== "reset" && <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: 4, marginBottom: 18 }}>
        {[["create", "Create account"], ["login", "Log in"]].map(([id, label]) => (
          <button key={id} data-testid={`mode-${id}`} onClick={() => switchMode(id)} className="press" style={{
            flex: 1, padding: "9px 0", borderRadius: 999, border: "none", fontSize: 13.5, fontWeight: 700,
            background: mode === id ? "rgba(255,255,255,0.92)" : "transparent", color: mode === id ? T.ink : T.textDim,
          }}>{label}</button>
        ))}
      </div>}

      {mode === "create" ? (
        <>
          <Input icon={<User size={16} />} value={displayName} onChange={setDisplayName} placeholder="e.g. George Q" label="Your name" maxLength={40}
            status={nameBad ? { bad: true, text: "Please pick a respectful name" } : null} />
          <Input icon={<AtSign size={16} />} value={handle} onChange={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="e.g. george_q" label="Handle" maxLength={24} status={handleStatus} />
          <div style={{ fontSize: 11.5, color: T.textDim, margin: "-4px 2px 14px" }}>Lowercase letters, numbers, _ and . only. Handles can't be changed later.</div>
          <Input icon={<Mail size={16} />} value={email} onChange={setEmail} placeholder="you@example.com" label="Email" maxLength={120} type="email" testid="email"
            status={email && !emailOk ? { bad: true, text: "That email doesn't look right" } : null} />
          {passField}
        </>
      ) : mode === "login" && (
        <>
          <Input icon={<AtSign size={16} />} value={email} onChange={setEmail} placeholder="Email or handle" label="Email or handle" maxLength={120} type="email" testid="email" />
          {passField}
          <button type="button" data-testid="forgot" onClick={() => switchMode("reset")} disabled={busy} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12.5, padding: "0 2px", margin: "-6px 0 14px", textDecoration: "underline" }}>Forgot password?</button>
        </>
      )}
      {mode === "reset" && (
        <>
          <div style={{ color: T.text, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Reset your password</div>
          <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.45, marginBottom: 14 }}>
            {codeSent ? "Type the code from the email and pick a new password." : "We'll email you a code to set a new password."}
          </div>
          <Input icon={<Mail size={16} />} value={email} onChange={setEmail} placeholder="you@example.com" label="Email" maxLength={120} type="email" testid="email" />
          {codeSent && (
            <>
              <Input icon={<KeyRound size={16} />} value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))} placeholder="6-digit code" label="Code from the email" maxLength={10} type="text" testid="reset-code" inputMode="numeric" />
              {passField}
            </>
          )}
        </>
      )}

      {error && <div data-testid="auth-error" style={{ color: T.accent, fontSize: 13, margin: "0 2px 12px", lineHeight: 1.4 }}>{error}</div>}
      {info && <div data-testid="auth-info" style={{ color: "#7BD389", fontSize: 13, margin: "0 2px 12px", lineHeight: 1.4 }}>{info}</div>}

      {mode === "reset" ? (
        <>
          {!codeSent ? (
            <button data-testid="send-code" disabled={!emailOk || busy} onClick={sendCode} className="press" style={primary(emailOk && !busy)}>
              {busy ? "Sending…" : "Email me a code"} <ChevronRight size={17} />
            </button>
          ) : (
            <button data-testid="set-password" disabled={!codeOk || !passOk || busy} onClick={setNewPassword} className="press" style={primary(codeOk && passOk && !busy)}>
              {busy ? "Saving…" : "Set new password"} <ChevronRight size={17} />
            </button>
          )}
          {codeSent && <button type="button" onClick={sendCode} disabled={busy} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12.5, marginTop: 12, width: "100%", textDecoration: "underline" }}>Send a new code</button>}
          <button type="button" data-testid="back-to-login" onClick={() => { setCodeSent(false); setCode(""); switchMode("login"); }} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12.5, marginTop: 8, width: "100%" }}>Back to log in</button>
        </>
      ) : mode === "create" ? (
        <button data-testid="submit-create" disabled={!canCreate || busy} onClick={create} className="press" style={primary(canCreate && !busy)}>
          {busy ? "Setting up…" : "Enter Carfooly"} <ChevronRight size={17} />
        </button>
      ) : (
        <button data-testid="submit-login" disabled={!canLogin || busy} onClick={login} className="press" style={primary(canLogin && !busy)}>
          {busy ? "Logging in…" : "Log in"} <ChevronRight size={17} />
        </button>
      )}
    </Frame>
  );
}

function Input({ icon, value, onChange, placeholder, label, maxLength, status, type = "text", trailing, testid, inputMode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 6 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textDim, display: "flex" }}>{icon}</div>
        <input data-testid={testid} type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} autoCapitalize="none" autoCorrect="off"
          autoComplete={type === "password" || (testid === "password") ? "current-password" : type === "email" ? "email" : "off"}
          style={{ width: "100%", padding: trailing ? "13px 44px 13px 40px" : "13px 14px 13px 40px", borderRadius: 16, border: `1px solid ${status ? (status.bad ? "rgba(230,56,70,0.6)" : "rgba(123,211,137,0.5)") : T.lineDark}`, background: "rgba(0,0,0,0.25)", color: T.text, fontSize: 15, outline: "none" }} />
        {trailing && <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex" }}>{trailing}</div>}
      </div>
      {status && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, marginTop: 5, color: status.bad ? T.accent : "#7BD389" }}>{!status.bad && <Check size={12} />}{status.text}</div>}
    </div>
  );
}

const primary = (on) => ({
  width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: on ? T.accent : "rgba(255,255,255,0.08)", color: on ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15.5, boxShadow: on ? T.shadowAccent : "none",
});
