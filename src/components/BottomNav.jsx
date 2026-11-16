import { useEffect, useRef, useState } from "react";
import { Car, Plus, Compass, User, Image as ImageIcon, MapPin, Calendar } from "lucide-react";
import { T } from "../theme";
import { tr } from "../lib/i18n";

const ITEMS = [
  { id: "feed", label: tr("Feed"), icon: Car },
  { id: "discover", label: tr("Discover"), icon: Compass },
  { id: "add", label: tr("Create"), aria: tr("Add"), icon: Plus },
  { id: "profile", label: tr("Profile"), icon: User },
];
const CREATE = [
  { id: "post", label: tr("Post"), icon: ImageIcon },
  { id: "spot", label: tr("Spot"), icon: MapPin },
  { id: "meet", label: tr("Meet"), icon: Calendar },
];
const HOLD_MS = 320;

// Floating nav. The current tab grows into a red capsule with its name; the others stay as
// smaller capsules of the same shape, sitting right next to it.
// Slide a finger along the bar to move between tabs (like a gear selector).
// Create (+): tap to open the create options above it, or hold and slide onto one and let go.
export function BottomNav({ active, onTab, onCreate, driver = true, hidden, raised }) {
  const bar = useRef(null);
  const drag = useRef(null);
  const hold = useRef(null);
  const [preview, setPreview] = useState(null);
  const [menu, setMenu] = useState(false);
  const [aim, setAim] = useState(null);       // create option under the finger while holding
  const options = driver ? CREATE : CREATE.filter((o) => o.id !== "spot");

  useEffect(() => { if (hidden) setMenu(false); }, [hidden]);

  const slotAt = (clientX) => {
    const btns = [...bar.current.querySelectorAll("[data-tab]")];
    let best = null, dist = Infinity;
    btns.forEach((b) => { const r = b.getBoundingClientRect(); const d = Math.abs(clientX - (r.left + r.width / 2)); if (d < dist) { dist = d; best = b.dataset.tab; } });
    return best;
  };
  // The option nearest the finger (generous, so you don't have to land exactly on it).
  const optionAt = (x, y) => {
    let best = null, dist = 64;
    document.querySelectorAll("[data-create]").forEach((b) => {
      const r = b.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < dist) { dist = d; best = b.dataset.create; }
    });
    return best;
  };

  const down = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId, onAdd: !!e.target.closest?.("[data-tab=add]") };
    if (drag.current.onAdd) {
      clearTimeout(hold.current);
      hold.current = setTimeout(() => {
        if (!drag.current || drag.current.moved) return;
        drag.current.held = true;
        setMenu(true);
        try { bar.current.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        if (navigator.vibrate) navigator.vibrate(12);
      }, HOLD_MS);
    }
  };
  const move = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.held) { setAim(optionAt(e.clientX, e.clientY)); return; }
    if (!d.moved && Math.abs(e.clientX - d.x) > 14 && Math.abs(e.clientX - d.x) > Math.abs(e.clientY - d.y)) {
      d.moved = true; clearTimeout(hold.current);
      try { bar.current.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (d.moved) setPreview(slotAt(e.clientX));
  };
  const swallow = useRef(false);
  const up = (e) => {
    clearTimeout(hold.current);
    const d = drag.current;
    drag.current = null;
    if (d?.held) {
      swallow.current = true;
      const pick = optionAt(e.clientX, e.clientY);
      setAim(null);
      if (pick) { setMenu(false); onCreate(pick); }
      return; // let go somewhere else: the options stay open to tap
    }
    const target = d && d.moved ? slotAt(e.clientX) : null;
    if (target) {
      setPreview(null);
      swallow.current = true; // the slide shouldn't also count as a tap
      if (target === "add") setMenu(true);
      else if (target !== active) { setMenu(false); onTab(target); }
    }
  };
  const tap = (id) => {
    if (id === "add") { setMenu((m) => !m); return; }
    setMenu(false);
    onTab(id);
  };
  const lit = menu ? "add" : preview || active;

  return (
    <>
      {menu && <div data-testid="create-backdrop" onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 44, background: "rgba(8,9,11,0.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", animation: "fadeIn .18s ease" }} />}
      {menu && (
        <div data-testid="create-menu" style={{ position: "fixed", left: 0, right: 0, bottom: "calc(96px + var(--inset-bottom))", zIndex: 46, display: "flex", justifyContent: "center", gap: 18, pointerEvents: "none" }}>
          {options.map(({ id, label, icon: Icon }, k) => {
            const on = aim === id;
            // An arc: the middle option sits higher.
            const lift = options.length === 3 ? (k === 1 ? 26 : 0) : 10;
            return (
              <button key={id} data-create={id} data-testid={`add-${id}`} onClick={() => { setMenu(false); onCreate(id); }}
                style={{ pointerEvents: "auto", background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                  transform: `translateY(${-lift}px)`, animation: `createPop .32s cubic-bezier(.2,1.3,.4,1) ${k * 45}ms both` }}>
                <span style={{ animation: `orbit 3.2s ease-in-out ${k * 0.5}s infinite`, display: "block" }}>
                  <span className="glass" style={{ width: on ? 66 : 58, height: on ? 66 : 58, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                    background: on ? T.accent : T.glassBg, boxShadow: on ? T.shadowAccent : T.shadowRaised, transition: "all .16s ease" }}>
                    <Icon size={on ? 26 : 23} color={on ? "#fff" : T.text} />
                  </span>
                </span>
                <span style={{ color: T.text, fontSize: 12, fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>{label}</span>
              </button>
            );
          })}
        </div>
      )}
      <div ref={bar} data-testid="bottom-nav" className="glass"
        onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onPointerCancel={() => { clearTimeout(hold.current); drag.current = null; setPreview(null); setAim(null); }}
        onClickCapture={(e) => { if (swallow.current) { swallow.current = false; e.stopPropagation(); e.preventDefault(); } }}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed", bottom: "calc(14px + var(--inset-bottom))", left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 4, borderRadius: 999, padding: 5,
          zIndex: raised || menu ? 47 : 20, touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
          opacity: hidden ? 0 : 1, pointerEvents: hidden ? "none" : "auto", transition: "opacity 0.2s ease",
        }}>
        {ITEMS.map(({ id, label, aria, icon: Icon }) => {
          const on = lit === id;
          return (
            <button key={id} aria-label={aria || label} data-tab={id} aria-current={on ? "page" : undefined} onClick={() => tap(id)}
              style={{
                height: 46, minWidth: 46, padding: on ? "0 16px 0 13px" : "0 12px", borderRadius: 999, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: on ? 7 : 0,
                background: on ? T.accent : "rgba(255,255,255,0.045)", boxShadow: on ? T.shadowAccent : "none",
                transition: "padding .28s cubic-bezier(.2,.8,.2,1), background .2s ease, gap .28s ease",
              }}>
              <Icon size={on ? 21 : 19} color={on ? "#fff" : T.textDim} style={{ transition: "transform .28s ease", transform: id === "add" && menu ? "rotate(45deg)" : "none" }} />
              <span aria-hidden={!on || undefined} style={{ maxWidth: on ? 90 : 0, opacity: on ? 1 : 0, visibility: on ? "visible" : "hidden", overflow: "hidden", whiteSpace: "nowrap", color: "#fff", fontSize: 13, fontWeight: 700,
                transition: "max-width .28s cubic-bezier(.2,.8,.2,1), opacity .2s ease" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
