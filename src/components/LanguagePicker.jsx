import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { T } from "../theme";
import { LANGS, deviceLanguage, lang, setLanguage, tr } from "../lib/i18n";
import { AR } from "../lib/lang/ar";

// The first thing shown on a fresh install: pick the app language.
// Shown in every language at once, since we don't know which one they read yet.
export function LanguageScreen() {
  const [pick, setPick] = useState(deviceLanguage());
  const say = (en) => (pick === "ar" ? AR[en] || en : en);
  return (
    <div data-testid="language-screen" dir={LANGS.find((l) => l.code === pick)?.dir} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 22px", maxWidth: 460, margin: "0 auto", color: T.text }}>
      <div style={{ width: 52, height: 52, borderRadius: 18, background: "rgba(230,56,70,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Globe size={24} color={T.accent} />
      </div>
      <div className="display" style={{ fontSize: 28, lineHeight: 1.15 }}>Choose your language</div>
      <div className="display" style={{ fontSize: 26, lineHeight: 1.3, color: T.textDim, marginBottom: 24 }} dir="rtl">اختر لغتك</div>
      <LanguageList value={pick} onChange={setPick} />
      <button data-testid="language-continue" onClick={() => setLanguage(pick)} className="press" style={{ marginTop: 22, width: "100%", padding: "14px 16px", borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 15.5 }}>
        {say("Continue")}
      </button>
      <div style={{ color: T.textDim, fontSize: 12, marginTop: 12, textAlign: "center" }}>{say("You can change this any time in Settings.")}</div>
    </div>
  );
}

export function LanguageList({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {LANGS.map((l) => {
        const on = value === l.code;
        return (
          <button key={l.code} data-testid={`lang-${l.code}`} onClick={() => onChange(l.code)} className="press" style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, textAlign: "start",
            border: `1.5px solid ${on ? T.accent : T.lineDark}`, background: on ? "rgba(230,56,70,0.12)" : T.surface, color: T.text,
          }}>
            <div style={{ flex: 1 }} dir={l.dir}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{l.native}</div>
              {l.native !== l.name && <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }} dir="ltr">{l.name}</div>}
            </div>
            {on && <Check size={18} color={T.accent} />}
          </button>
        );
      })}
    </div>
  );
}

// Settings → Language. Switching restarts the app in the new language.
export function LanguageSettings() {
  const [pick, setPick] = useState(lang);
  return (
    <div>
      <LanguageList value={pick} onChange={setPick} />
      <button data-testid="language-apply" disabled={pick === lang} onClick={() => setLanguage(pick)} className="press" style={{ marginTop: 16, width: "100%", padding: "13px 16px", borderRadius: 16, border: "none", background: pick === lang ? T.surface2 : T.accent, color: pick === lang ? T.textDim : "#fff", fontWeight: 700, fontSize: 15 }}>
        {tr("Switch language")}
      </button>
      <div style={{ color: T.textDim, fontSize: 12, marginTop: 10, textAlign: "center" }}>{tr("The app restarts in the new language.")}</div>
    </div>
  );
}
