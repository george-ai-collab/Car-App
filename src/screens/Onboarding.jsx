import { useState } from "react";
import { Car } from "lucide-react";
import { T } from "../theme";
import { Avatar } from "../components/ui";

export function Onboarding({ onSubmit, users = {} }) {
  const known = Object.entries(users).filter(([, u]) => u && u.name).slice(0, 6);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 16, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Car size={22} color="#fff" />
          </div>
          <div className="display" style={{ fontSize: 26, color: T.text }}>CARFOOLY</div>
        </div>
        <div style={{ color: T.textDim, fontSize: 14, marginBottom: 28 }}>Every car has a story. This is where it lives.</div>
        <div style={{ background: T.paper, borderRadius: 20, padding: 20, border: `1px solid ${T.linePaper}`, boxShadow: T.shadowRaised }}>
          <div className="plate" style={{ fontSize: 11, color: T.inkMuted, marginBottom: 8 }}>Your name</div>
          <input
            value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. George Q" maxLength={40}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 16, border: `1px solid ${T.linePaper}`, background: "#fff", color: T.ink, fontSize: 15, marginBottom: 14, outline: "none" }}
          />
          <div className="plate" style={{ fontSize: 11, color: T.inkMuted, marginBottom: 8 }}>Your handle</div>
          <input
            value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="e.g. george_q" maxLength={24} autoCapitalize="none" autoCorrect="off"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 16, border: `1px solid ${T.linePaper}`, background: "#fff", color: T.ink, fontSize: 15, marginBottom: 14, outline: "none" }}
          />
          <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: -8, marginBottom: 14 }}>Lowercase letters, numbers, _ and . only</div>
          <p style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.5, marginBottom: 16 }}>
            This is a beta. Posts, cars, likes, and follows you add are visible to everyone else testing it — nothing private yet.
          </p>
          <button
            disabled={!handle.trim() || busy} className="press"
            onClick={async () => { setBusy(true); await onSubmit(handle, displayName); setBusy(false); }}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", background: handle.trim() ? T.accent : T.paper2, color: "#fff", fontWeight: 600, fontSize: 15, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Joining…" : "Enter Carfooly"}
          </button>
        </div>
        {known.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 10 }}>Accounts on this phone</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {known.map(([h, u]) => (
                <button key={h} data-testid="known-account" disabled={busy} onClick={async () => { setBusy(true); await onSubmit(h, u.name || ""); setBusy(false); }} className="press" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16,
                  background: T.surface, border: `1px solid ${T.lineDark}`, textAlign: "left",
                }}>
                  <Avatar username={h} size={32} />
                  <div>
                    <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                    <div className="plate" style={{ color: T.textDim, fontSize: 10.5 }}>@{h}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
