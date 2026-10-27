import { useState, useEffect, createContext, useContext } from "react";
import { MoreHorizontal, Flag, Share2, EyeOff, Ban } from "lucide-react";
import { T } from "../theme";
import { ActionMenu, BottomSheet, TextArea } from "./ui";
import { shareText } from "../lib/share";
import { PERMISSION_HELP } from "../lib/permissions";

export const REPORT_REASONS = [
  "Spam or scam",
  "Harassment or hate",
  "Dangerous driving or street racing",
  "Nudity or violence",
  "Shows someone's private info (plate, address)",
  "Not about cars / off-topic",
  "Something else",
];

// Pick a reason, add an optional note, send.
export function ReportSheet({ open, onClose, what, onSend }) {
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");
  const close = () => { setReason(null); setNote(""); onClose(); };
  return (
    <BottomSheet open={open} onClose={close} title={`Report ${what}`} maxHeight="80vh">
      <div style={{ color: T.textDim, fontSize: 13, marginBottom: 12 }}>Reports are private. The person won't know it was you.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {REPORT_REASONS.map((r) => (
          <button key={r} data-testid="report-reason" onClick={() => setReason(r)} className="press" style={{
            padding: "12px 14px", borderRadius: 14, textAlign: "left", fontSize: 14, fontWeight: 600,
            border: `1px solid ${reason === r ? T.accent : "transparent"}`, background: reason === r ? "rgba(230,56,70,0.14)" : "rgba(255,255,255,0.06)", color: T.text,
          }}>{r}</button>
        ))}
      </div>
      {reason && <div style={{ marginTop: 12 }}><TextArea value={note} onChange={setNote} placeholder="Anything else we should know? (optional)" maxLength={300} rows={2} /></div>}
      <button disabled={!reason} onClick={async () => { await onSend(reason, note); close(); }} className="press" style={{
        width: "100%", marginTop: 12, padding: 13, borderRadius: 16, border: "none", fontWeight: 600, fontSize: 15,
        background: reason ? T.accent : T.surface2, color: reason ? "#fff" : T.textDim,
      }}>Send report</button>
    </BottomSheet>
  );
}

// The "···" button for things you don't own (and the share option for things you do).
// items: extra rows for the owner (edit/delete…). Others get Share, Not interested, Report, Block.
export function MoreMenu({ label = "More options", testid = "more-menu", items = [], share, report, hide, block, flash, overlay, size = 18 }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const rows = [
    ...items,
    share && { label: "Share", icon: <Share2 size={17} />, onClick: async () => { const r = await shareText(share); if (r === "copied" && flash) flash("Copied to share"); } },
    hide && { label: "Not interested", icon: <EyeOff size={17} />, onClick: hide },
    report && { label: `Report ${report.what}`, icon: <Flag size={17} />, danger: true, onClick: () => setReporting(true) },
    block && { label: block.blocked ? `Unblock @${block.handle}` : `Block @${block.handle}`, icon: <Ban size={17} />, danger: !block.blocked, onClick: block.onToggle },
  ].filter(Boolean);
  if (!rows.length) return null;
  return (
    <>
      <button aria-label={label} data-testid={testid} onClick={(e) => { e.stopPropagation(); setOpen(true); }} className="press" style={overlay
        ? { width: 52, height: 32, background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }
        : { background: "rgba(255,255,255,0.06)", border: "none", padding: 7, borderRadius: 999, display: "flex" }}>
        <MoreHorizontal size={overlay ? 28 : size} color={overlay ? "#fff" : T.text} style={overlay ? { filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" } : undefined} />
      </button>
      <ActionMenu open={open} onClose={() => setOpen(false)} items={rows} />
      {report && <ReportSheet open={reporting} onClose={() => setReporting(false)} what={report.what} onSend={report.onSend} />}
    </>
  );
}

// Shared access to report / hide / block from anywhere (set up in Shell).
export const SafetyContext = createContext(null);
export const useSafety = () => useContext(SafetyContext);

// The message shown when a permission was refused (see lib/permissions.js).
export function PermissionNotice() {
  const [kind, setKind] = useState(null);
  useEffect(() => {
    const on = (e) => setKind(e.detail);
    window.addEventListener("carfooly-permission", on);
    return () => window.removeEventListener("carfooly-permission", on);
  }, []);
  const info = kind && PERMISSION_HELP[kind];
  return (
    <BottomSheet open={!!info} onClose={() => setKind(null)} title={info?.title} maxHeight="70vh">
      {info && (
        <div data-testid="permission-notice">
          <div style={{ color: T.text, fontSize: 14.5, lineHeight: 1.5, marginBottom: 14 }}>{info.body}</div>
          <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 6 }}>To turn it on</div>
          <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.5, background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "10px 12px", marginBottom: 16 }}>{info.steps}</div>
          <button onClick={() => setKind(null)} className="press" style={{ width: "100%", padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 15 }}>OK</button>
        </div>
      )}
    </BottomSheet>
  );
}
