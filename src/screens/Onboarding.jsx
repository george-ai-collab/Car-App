import { useState } from "react";
import { Car, AtSign, User, ChevronRight, Check } from "lucide-react";
import { T } from "../theme";
import { Avatar } from "../components/ui";

// Sign up / log in. Same look as the rest of the app: dark, red accent, glass card.
// (For now accounts live on this phone; real email/Google sign-in arrives with the online version.)
export function Onboarding({ onSubmit, users = {} }) {
  const known = Object.entries(users).filter(([, u]) => u && u.name).slice(0, 6);
  const [mode, setMode] = useState(known.length ? "login" : "create");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = handle.trim().toLowerCase();
  const valid = /^[a-z0-9_.]{2,24}$/.test(clean);
  const taken = mode === "create" && valid && !!users[clean];
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
                status={!clean ? null : taken ? { bad: true, text: "Taken. Try another, or log in." } : !valid ? { bad: true, text: "2–24 characters" } : { bad: false, text: "Available" }} />
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
                          <div className="plate" style={{ color: T.textDim, fontSize: 10.5 }}>@{h}</div>
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

function Input({ icon, value, onChange, placeholder, label, maxLength, status }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 6 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textDim, display: "flex" }}>{icon}</div>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} autoCapitalize="none" autoCorrect="off"
          style={{ width: "100%", padding: "13px 14px 13px 40px", borderRadius: 16, border: `1px solid ${status ? (status.bad ? "rgba(230,56,70,0.6)" : "rgba(123,211,137,0.5)") : T.lineDark}`, background: "rgba(0,0,0,0.25)", color: T.text, fontSize: 15, outline: "none" }} />
      </div>
      {status && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, marginTop: 5, color: status.bad ? T.accent : "#7BD389" }}>{!status.bad && <Check size={12} />}{status.text}</div>}
    </div>
  );
}

const primary = (on) => ({
  width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: on ? T.accent : "rgba(255,255,255,0.08)", color: on ? "#fff" : T.textDim, fontWeight: 700, fontSize: 15.5, boxShadow: on ? T.shadowAccent : "none",
});
