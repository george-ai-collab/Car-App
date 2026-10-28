import { useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { ExternalLink } from "lucide-react";
import { T } from "../theme";
import { BottomSheet, UsersContext } from "./ui";
import { useSafety } from "./Safety";
import { cleanText, tokenize } from "../lib/text";

// Captions, bios and comments: @handles open that profile, website links open the browser
// (after a "you're leaving Carfooly" check). Long text can be clamped with "more".
export function RichText({ text, maxLines, clamp, style, linkColor, onDark, onMore }) {
  const users = useContext(UsersContext);
  const safety = useSafety();
  const [open, setOpen] = useState(false);
  const clean = cleanText(text, maxLines);
  if (!clean) return null;
  const parts = tokenize(clean);
  const long = clamp && (clean.split("\n").length > clamp || clean.length > clamp * 60);
  const color = linkColor || (onDark ? "#fff" : T.accent);
  const stop = (e) => { e.stopPropagation(); };
  return (
    <div data-testid="rich-text" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", ...style }}>
      <span style={long && !open ? { display: "-webkit-box", WebkitLineClamp: clamp, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>
        {parts.map((p, i) => {
          if (p.type === "mention") {
            if (!users?.[p.handle] || !safety?.openProfile) return <span key={i}>{p.value}</span>;
            return (
              <button key={i} data-testid="mention" onPointerDown={stop} onClick={(e) => { stop(e); safety.openProfile(p.handle); }}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", color, fontWeight: 700, cursor: "pointer" }}>{p.value}</button>
            );
          }
          if (p.type === "link") {
            return (
              <button key={i} data-testid="link" onPointerDown={stop} onClick={(e) => { stop(e); askToOpen(p.url); }}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", color, textDecoration: "underline", cursor: "pointer", textAlign: "left", overflowWrap: "anywhere" }}>{p.value}</button>
            );
          }
          return <span key={i}>{p.value}</span>;
        })}
      </span>
      {long && (
        <button data-testid="caption-more" onPointerDown={stop} onClick={(e) => { stop(e); if (onMore) onMore(); else setOpen((x) => !x); }}
          style={{ background: "none", border: "none", padding: 0, marginTop: 2, font: "inherit", fontWeight: 700, color: onDark ? "rgba(255,255,255,0.75)" : T.textDim }}>
          {open ? "less" : "more"}
        </button>
      )}
    </div>
  );
}

const askToOpen = (url) => window.dispatchEvent(new CustomEvent("carfooly-open-link", { detail: url }));

export async function openExternal(url) {
  try {
    if (Capacitor.isNativePlatform()) await Browser.open({ url });
    else window.open(url, "_blank", "noopener,noreferrer");
  } catch { /* ignore */ }
}

// The check before leaving the app (rendered once, in Shell).
export function LinkNotice() {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const on = (e) => setUrl(e.detail);
    window.addEventListener("carfooly-open-link", on);
    return () => window.removeEventListener("carfooly-open-link", on);
  }, []);
  let host = "";
  try { host = url ? new URL(url).hostname.replace(/^www\./, "") : ""; } catch { host = url || ""; }
  return (
    <BottomSheet open={!!url} onClose={() => setUrl(null)} title="Leaving Carfooly" maxHeight="70vh">
      {url && (
        <div data-testid="link-notice">
          <div style={{ color: T.text, fontSize: 14.5, lineHeight: 1.5, marginBottom: 12 }}>
            This link opens <b>{host}</b>, a website outside Carfooly. We don't check these sites, so only open links you trust.
          </div>
          <div style={{ color: T.textDim, fontSize: 12.5, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "9px 11px", marginBottom: 16, overflowWrap: "anywhere" }}>{url}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setUrl(null)} className="press" style={{ flex: 1, padding: 13, borderRadius: 16, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.text, fontWeight: 700, fontSize: 15 }}>Cancel</button>
            <button data-testid="open-link" onClick={() => { const u = url; setUrl(null); openExternal(u); }} className="press" style={{ flex: 1, padding: 13, borderRadius: 16, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              Open <ExternalLink size={15} />
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
