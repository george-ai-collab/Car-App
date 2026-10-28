import { useMemo, useState } from "react";
import { Share2, ScanLine } from "lucide-react";
import { T } from "../theme";
import { BottomSheet } from "./ui";
import { qrMatrix, tagLink } from "../lib/tag";
import { shareImage } from "../lib/shareImage";
import { tr } from "../lib/i18n";

// The QR code itself. Black on white (scans best), with an empty square in the middle
// kept free for the app logo.
export function TagQR({ text, size = 240 }) {
  const m = useMemo(() => qrMatrix(text), [text]);
  const quiet = 3;
  const total = m.n + quiet * 2;
  const rects = [];
  for (let r = 0; r < m.n; r++) {
    for (let c = 0; c < m.n; c++) {
      if (m.dark(r, c)) rects.push(`M${c + quiet} ${r + quiet}h1v1h-1z`);
    }
  }
  const h = m.hole;
  return (
    <svg data-testid="tag-qr" data-tag={text} width={size} height={size} viewBox={`0 0 ${total} ${total}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <rect width={total} height={total} fill="#fff" />
      <path d={rects.join("")} fill="#0A0A0B" />
      {/* Logo space: left empty on purpose for now. */}
      <rect data-testid="tag-logo-space" x={h.start + quiet + 0.5} y={h.start + quiet + 0.5} width={h.size - 1} height={h.size - 1} rx={1.4} fill="#fff" stroke="#E7E4E0" strokeWidth={0.18} />
    </svg>
  );
}

// "Share tag": a card with the name and the QR code, plus Share / Save and Scan.
// kind: "user" (id = handle) or "car" (id = car id).
export function ShareTagSheet({ open, onClose, kind, id, title, subtitle, onScan, flash }) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const link = tagLink(kind, id);
  const doShare = async () => {
    setBusy(true);
    const r = await shareImage({
      png: drawTagCard({ link, title, subtitle, kind }),
      name: `carfooly-tag-${kind === "car" ? "car" : id}.png`,
      text: kind === "car" ? tr("{0} on Carfooly. Scan the tag to open its page.", title) : tr("Find me on Carfooly: @{0}. Scan my tag to open my profile.", id),
    });
    setBusy(false);
    if (r === "saved" && flash) flash(tr("Tag saved"));
    if (r === "failed" && flash) flash(tr("Couldn't share the tag. Try again."));
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={kind === "car" ? tr("Car tag") : tr("Your tag")} maxHeight="90vh">
      <div data-testid="share-tag" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: "100%", borderRadius: 26, padding: "20px 18px 18px", textAlign: "center",
          background: "radial-gradient(120% 70% at 50% 0%, rgba(230,56,70,0.30), rgba(10,10,11,0) 70%), #121214",
          border: `1px solid ${T.lineDark}`,
        }}>
          <div className="plate" style={{ fontSize: 10.5, color: T.textDim, letterSpacing: "0.18em" }}>{tr("CARFOOLY")}</div>
          <div className="display" data-testid="tag-title" style={{ fontSize: 22, color: T.text, marginTop: 8, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {subtitle && <div className={subtitle.startsWith("@") ? "plate handle" : "plate"} style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>{subtitle}</div>}
          <div style={{ display: "inline-block", background: "#fff", borderRadius: 22, padding: 12, marginTop: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.45)" }}>
            <TagQR text={link} size={216} />
          </div>
          <div style={{ color: T.textDim, fontSize: 12.5, marginTop: 12 }}>
            {kind === "car" ? tr("Scan to open this car's page") : tr("Scan to open my profile")}
          </div>
        </div>
        <div style={{ color: T.textDim, fontSize: 11.5, lineHeight: 1.45, margin: "12px 4px 14px", textAlign: "center" }}>
          {tr("This tag never changes. Print it, stick it on the car, or post it. To keep a copy, pick \"Save\" in the share menu.")}
        </div>
        <button data-testid="tag-share" disabled={busy} onClick={doShare} className="press" style={{ ...btn(true), width: "100%" }}><Share2 size={16} /> {tr("Share tag")}</button>
        {onScan && (
          <button data-testid="tag-scan" onClick={onScan} className="press" style={{ ...btn(false), width: "100%", marginTop: 8 }}><ScanLine size={16} /> {tr("Scan someone's tag")}</button>
        )}
      </div>
    </BottomSheet>
  );
}

const btn = (primary) => ({
  flex: 1, padding: "13px 14px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
  border: primary ? "none" : `1px solid ${T.lineDark}`, background: primary ? T.accent : "transparent",
  color: primary ? "#fff" : T.text, fontWeight: 700, fontSize: 14.5, boxShadow: primary ? T.shadowAccent : "none",
});

// The shareable picture (1080×1350, the size Instagram and WhatsApp like).
export function drawTagCard({ link, title, subtitle, kind }) {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "#0A0A0B"; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 0, 0, W / 2, 0, 900);
  glow.addColorStop(0, "rgba(230,56,70,0.45)"); glow.addColorStop(1, "rgba(10,10,11,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.fillStyle = "rgba(245,244,242,0.6)"; g.font = "600 30px monospace";
  g.fillText("C A R F O O L Y", W / 2, 120);
  g.fillStyle = "#F5F4F2"; g.font = "800 66px system-ui, sans-serif";
  g.fillText(fit(g, title || "", W - 140), W / 2, 230);
  if (subtitle) { g.fillStyle = "rgba(245,244,242,0.6)"; g.font = "500 36px monospace"; g.fillText(fit(g, subtitle, W - 140), W / 2, 290); }

  const box = 740, bx = (W - box) / 2, by = 360;
  g.fillStyle = "#fff"; roundRect(g, bx, by, box, box, 60); g.fill();
  const m = qrMatrix(link);
  const pad = 56, cell = Math.floor((box - pad * 2) / m.n), off = Math.round(bx + (box - cell * m.n) / 2), offY = Math.round(by + (box - cell * m.n) / 2);
  g.fillStyle = "#0A0A0B";
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) g.fillRect(off + c * cell, offY + r * cell, cell, cell);
  // logo space stays white
  g.fillStyle = "rgba(245,244,242,0.6)"; g.font = "500 34px system-ui, sans-serif";
  g.fillText(kind === "car" ? tr("Scan with Carfooly to open this car") : tr("Scan with Carfooly to open my profile"), W / 2, by + box + 100);
  return cv.toDataURL("image/png");
}

function fit(g, text, max) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
