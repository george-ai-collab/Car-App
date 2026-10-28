import { useState } from "react";
import { ChevronRight, Car, Users, Store, Check } from "lucide-react";
import { T } from "../theme";
import { Avatar, Field, TextInput, TextArea } from "./ui";
import { AvatarPicker } from "../screens/Settings";
import { useKeyboardOffset } from "../lib/keyboard";
import { MAX_LINES } from "../lib/text";

// Account types. Most people are "personal"; clubs and businesses just get a small label
// on their profile. They don't get pushed in the feed, so the app stays a place for drivers.
export const ACCOUNT_TYPES = [
  { id: "personal", title: "I'm into cars", body: "Post your car, spot cars, go to meets. Most people pick this.", icon: Car },
  { id: "club", title: "I run a car club", body: "Organise meets for your members. Your profile gets a Club label.", icon: Users },
  { id: "business", title: "I run a car business", body: "Shop, garage, detailer, tuner… Your profile gets a Business label.", icon: Store },
];

export function AccountTypePicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ACCOUNT_TYPES.map(({ id, title, body, icon: Icon }) => {
        const on = value === id;
        return (
          <button key={id} data-testid={`type-${id}`} onClick={() => onChange(id)} className="press" style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", borderRadius: 18, textAlign: "left",
            background: on ? "rgba(230,56,70,0.12)" : T.surface, border: `1px solid ${on ? T.accent : T.lineDark}`,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: on ? T.accent : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={19} color={on ? "#fff" : T.text} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700 }}>{title}</div>
              <div style={{ color: T.textDim, fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>{body}</div>
            </div>
            {on && <Check size={18} color={T.accent} />}
          </button>
        );
      })}
    </div>
  );
}

// First time after creating an account: three quick, skippable steps.
// onDone({ name, bio, avatar, accountType }, addCar)
export function Welcome({ me, user = {}, onDone }) {
  const kb = useKeyboardOffset();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [type, setType] = useState(user.accountType || "personal");
  const finish = (addCar) => onDone({ name, bio, avatar, accountType: type }, addCar);
  const steps = type === "personal" ? 3 : 2;

  return (
    <div data-testid="welcome" style={{ position: "fixed", inset: 0, zIndex: 70, background: T.bg, overflowY: "auto" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, height: 360, pointerEvents: "none", background: "radial-gradient(90% 60% at 50% 0%, rgba(230,56,70,0.22), rgba(10,10,11,0) 70%)" }} />
      <div style={{ position: "relative", maxWidth: 440, margin: "0 auto", padding: `28px 20px ${kb + 30}px`, minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: steps }, (_, i) => (
              <div key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 99, background: i <= step ? T.accent : "rgba(255,255,255,0.15)", transition: "width 0.2s" }} />
            ))}
          </div>
          {step < steps - 1 && <button data-testid="welcome-skip" onClick={() => setStep(step + 1)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 13.5, fontWeight: 600 }}>Skip</button>}
        </div>

        {step === 0 && (
          <>
            <div className="display" style={{ fontSize: 26, color: T.text }}>Make it yours</div>
            <div style={{ color: T.textDim, fontSize: 14, marginTop: 6, marginBottom: 22 }}>Add a photo and a line about you. You can change it any time.</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
              {avatar ? <img src={avatar} alt="" style={{ width: 104, height: 104, borderRadius: 999, objectFit: "cover" }} /> : <Avatar username={me} size={104} />}
              <AvatarPicker onPick={setAvatar} />
            </div>
            <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Your name" maxLength={40} /></Field>
            <Field label="Bio"><TextArea value={bio} onChange={setBio} placeholder="Your cars, your scene, your plans" maxLength={150} maxLines={MAX_LINES.bio} rows={3} /></Field>
          </>
        )}

        {step === 1 && (
          <>
            <div className="display" style={{ fontSize: 26, color: T.text }}>What brings you here?</div>
            <div style={{ color: T.textDim, fontSize: 14, marginTop: 6, marginBottom: 20 }}>Pick carefully: this can't be changed later. Most people are drivers.</div>
            <AccountTypePicker value={type} onChange={setType} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="display" style={{ fontSize: 26, color: T.text }}>Got a car?</div>
            <div style={{ color: T.textDim, fontSize: 14, marginTop: 6, marginBottom: 22 }}>
              Give it a page: its build, its mods, every time someone spots it. No car? No problem. You can still post, spot and go to meets.
            </div>
            <div style={{ borderRadius: 22, padding: 22, background: `linear-gradient(150deg, ${T.surface2}, ${T.surface})`, border: `1px solid ${T.lineDark}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Car size={64} color={T.accent} strokeWidth={1.2} />
            </div>
          </>
        )}

        <div style={{ flex: 1, minHeight: 24 }} />
        {step === 1 && type !== "personal" ? (
          // Clubs and businesses don't keep cars: this is the last step for them.
          <button data-testid="welcome-done" onClick={() => finish(false)} className="press" style={primary}>Take me in <ChevronRight size={17} /></button>
        ) : step < 2 ? (
          <button data-testid="welcome-next" onClick={() => setStep(step + 1)} className="press" style={primary}>Next <ChevronRight size={17} /></button>
        ) : (
          <>
            <button data-testid="welcome-add-car" onClick={() => finish(true)} className="press" style={primary}>Add my car <ChevronRight size={17} /></button>
            <button data-testid="welcome-done" onClick={() => finish(false)} className="press" style={{ ...primary, background: "transparent", border: `1px solid ${T.lineDark}`, boxShadow: "none", marginTop: 10 }}>Not now, take me in</button>
          </>
        )}
      </div>
    </div>
  );
}

const primary = {
  width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: T.accent, color: "#fff", fontWeight: 700, fontSize: 15.5, boxShadow: T.shadowAccent,
};
