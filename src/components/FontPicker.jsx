import { useEffect, useState } from "react";
import { T } from "../theme";
import { FONT_CHOICES, savedFonts, setFont, resetFonts } from "../lib/fonts";
import { tr } from "../lib/i18n";

const ROLES = [
  ["display", "Headings"],
  ["body", "Body text"],
  ["mono", "Plates and handles"],
  ["arabic", "Arabic letters"],
];
const SAMPLE = { display: "Sunday Night Meet", body: "Spotted a clean E46 at the harbour.", mono: "@SPEED_DAILY · DXB 4821", arabic: "لقاء السيارات الليلة" };

// Loads every font in the list once, so each choice can show itself.
function usePreviewFonts() {
  useEffect(() => {
    if (window.__noWebFonts || document.getElementById("font-previews")) return;
    const all = Object.values(FONT_CHOICES).flat();
    const fams = [...new Set(all.map((f) => f.name))].map((n) => `family=${n.replace(/ /g, "+")}`).join("&");
    const link = document.createElement("link");
    link.id = "font-previews"; link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fams}&display=swap&text=${encodeURIComponent("AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789@·_ لقاءالسياراتلليلة")}`;
    document.head.appendChild(link);
  }, []);
}

// Settings → Fonts (testing): try open-source fonts live, then tell us which ones to keep.
export function FontSettings() {
  usePreviewFonts();
  const [picked, setPicked] = useState(savedFonts());
  return (
    <div data-testid="font-settings">
      <div style={{ color: T.textDim, fontSize: 12.5, lineHeight: 1.45, marginBottom: 14 }}>
        {tr("All of these are free, open-source fonts. Changes show straight away. This screen is only here while we pick the app's fonts.")}
      </div>
      {ROLES.map(([role, label]) => (
        <div key={role} style={{ marginBottom: 18 }}>
          <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 8 }}>{tr(label)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {FONT_CHOICES[role].map((f) => {
              const on = picked[role] === f.name;
              return (
                <button key={f.name} data-testid={`font-${role}-option`} onClick={() => setPicked(setFont(role, f.name))} className="press" style={{
                  display: "flex", alignItems: "baseline", gap: 10, padding: "11px 13px", borderRadius: 14, textAlign: "start",
                  border: `1.5px solid ${on ? T.accent : T.lineDark}`, background: on ? "rgba(230,56,70,0.12)" : T.surface, color: T.text,
                }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontFamily: `'${f.name}', system-ui`, fontSize: role === "display" ? 19 : 15, fontWeight: role === "display" ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} dir={role === "arabic" ? "rtl" : "ltr"}>
                      {role === "arabic" ? SAMPLE.arabic : f.name}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: T.textDim, marginTop: 2 }}>{role === "arabic" ? `${f.name} · ` : ""}{tr(f.note)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 18, padding: 14, marginBottom: 12 }}>
        <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 8 }}>{tr("Preview")}</div>
        <div className="display" style={{ fontSize: 24, color: T.text }}>{SAMPLE.display}</div>
        <div style={{ fontSize: 14.5, color: T.text, marginTop: 4 }}>{SAMPLE.body}</div>
        <div className="plate handle" style={{ fontSize: 12, color: T.textDim, marginTop: 6 }}>{SAMPLE.mono}</div>
        <div style={{ fontSize: 15, color: T.text, marginTop: 8 }} dir="rtl">{SAMPLE.arabic} · شوفوا سيارتي الجديدة</div>
      </div>
      <button data-testid="font-reset" onClick={() => setPicked(resetFonts())} className="press" style={{ width: "100%", padding: "11px 14px", borderRadius: 14, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.text, fontSize: 13.5, fontWeight: 600 }}>
        {tr("Back to the current fonts")}
      </button>
    </div>
  );
}
