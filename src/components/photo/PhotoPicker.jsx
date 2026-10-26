import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { T } from "../../theme";
import { readPhoto } from "./CameraCapture";
import { canPickNatively, pickFromGallery, takePhoto } from "../../lib/media";

// Big "add a photo" area with two choices: take one now, or pick from the gallery.
// aspect = width ÷ height of the empty area. children = extra art inside (e.g. viewfinder corners).
export function PhotoPicker({ onPick, aspect = 4 / 5, title = "Add a photo", hint, maxDim = 1440, quality = 0.8, children, testid = "photo-picker" }) {
  const cam = useRef(null), lib = useRef(null);
  const [busy, setBusy] = useState(false);
  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const p = await readPhoto(file, maxDim, quality); onPick(p.src, { w: p.w, h: p.h }); }
    finally { setBusy(false); }
  };
  const btn = (primary) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 16,
    border: primary ? "none" : "1px solid rgba(255,255,255,0.18)", background: primary ? T.accent : "rgba(255,255,255,0.06)",
    color: "#fff", fontWeight: 700, fontSize: 13.5, boxShadow: primary ? T.shadowAccent : "none",
  });
  return (
    <div data-testid={testid} style={{
      position: "relative", width: `min(100%, calc(56vh * ${aspect}))`, margin: "0 auto", aspectRatio: String(aspect), borderRadius: 24, overflow: "hidden",
      background: "radial-gradient(120% 90% at 50% 20%, rgba(230,56,70,0.16), rgba(24,24,27,1) 70%)", border: `1.5px dashed ${T.lineDark}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: 16,
    }}>
      {children}
      <input ref={cam} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { handle(e.target.files[0]); e.target.value = ""; }} />
      <input ref={lib} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { handle(e.target.files[0]); e.target.value = ""; }} />
      <div style={{ position: "absolute", top: "38%", left: 0, right: 0, transform: "translateY(-50%)", textAlign: "center", padding: "0 20px", pointerEvents: "none" }}>
        {busy ? <Loader2 size={28} color={T.accent} style={{ animation: "spin 1s linear infinite" }} /> : <Camera size={30} color="rgba(255,255,255,0.75)" />}
        <div style={{ color: T.text, fontSize: 16, fontWeight: 700, marginTop: 10 }}>{busy ? "Processing…" : title}</div>
        {hint && <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, width: "100%", position: "relative" }}>
        <button onClick={async () => { if (canPickNatively()) { const b = await takePhoto(); if (b) handle(b); } else cam.current.click(); }} disabled={busy} className="press" style={btn(true)}><Camera size={15} /> Camera</button>
        <button onClick={async () => { if (canPickNatively()) { const [b] = await pickFromGallery(1); if (b) handle(b); } else lib.current.click(); }} disabled={busy} className="press" style={btn(false)}><ImageIcon size={15} /> Gallery</button>
      </div>
    </div>
  );
}
