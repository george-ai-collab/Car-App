import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { T } from "../../theme";
import { IconBadge } from "../ui";
import { tr } from "../../lib/i18n";

// Shrinks a picked photo so it isn't huge. Resolves to { src, w, h }.
export function readPhoto(file, maxDim = 1440, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ src: canvas.toDataURL("image/jpeg", quality), w: canvas.width, h: canvas.height });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Picks or takes a photo, shrinks it, and returns (dataUrl, {w, h}).
export function CameraCapture({ value, onChange, allowLibrary, maxDim = 1440, quality = 0.8, label }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onChange(canvas.toDataURL("image/jpeg", quality), { w: canvas.width, h: canvas.height });
        setBusy(false);
      };
      img.onerror = () => setBusy(false);
      img.src = e.target.result;
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" {...(allowLibrary ? {} : { capture: "environment" })} style={{ display: "none" }}
        onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
      {value ? (
        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden" }}>
          <img src={value} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          <button onClick={() => inputRef.current.click()} className="glass press" style={{
            position: "absolute", bottom: 10, right: 10, border: "none", padding: "8px 12px", borderRadius: 999,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Camera size={14} color="#fff" /><span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{allowLibrary ? tr("Change") : tr("Retake")}</span>
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} disabled={busy} className="press" style={{
          width: "100%", height: 170, borderRadius: 18, border: `1.5px dashed ${T.lineDark}`, background: T.surface,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <IconBadge size={42}><Camera size={19} color={T.accent} /></IconBadge>
          <span style={{ color: T.textDim, fontSize: 12.5, fontWeight: 600 }}>{busy ? tr("Processing…") : label || (allowLibrary ? tr("Choose a photo") : tr("Take a photo"))}</span>
        </button>
      )}
    </div>
  );
}
