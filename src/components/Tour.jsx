import { useState } from "react";
import { Car, Compass, Plus, User, Heart, MessageCircle, MapPin, Calendar, Users, ChevronRight, ArrowUp, Wrench, Image as ImageIcon } from "lucide-react";
import { T } from "../theme";
import { useSwipe } from "../lib/useSwipe";
import { tr } from "../lib/i18n";

// The short "how it works" shown the first time someone opens the app (and from Settings).
const SLIDES = [
  {
    title: tr("Every car has a story"),
    body: tr("Carfooly gives each car its own page: photos, mods and a build log that stays with it for good."),
    art: () => <Orbit center={<Car size={42} color="#fff" />} items={[<Wrench key="w" size={18} />, <ImageIcon key="i" size={18} />, <Heart key="h" size={18} />]} />,
  },
  {
    title: tr("Double-tap to like"),
    body: tr("Swipe up for the next post. Double-tap a post (or a comment) to like it. Press and hold a post to comment, share or open it."),
    art: () => (
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Gesture icon={<Heart size={20} color={T.accent} fill={T.accent} />} label={tr("Double-tap")} />
        <Phone><ArrowUp size={22} color="#fff" /><div style={{ color: "#fff", fontSize: 10, marginTop: 4, fontWeight: 700 }}>{tr("Next")}</div></Phone>
        <Gesture icon={<MessageCircle size={20} />} label={tr("Hold")} />
      </div>
    ),
  },
  {
    title: tr("Tap + to share"),
    body: tr("Post photos of a car (straight from your gallery), log a spot, plan a meet, or add a car to your garage."),
    art: () => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[[ImageIcon, tr("Post"), T.accent], [MapPin, tr("Spot"), T.accent2], [Calendar, tr("Meet"), "#BFE0EC"], [Car, tr("Add car"), T.accentWarm]].map(([I, l, c]) => (
          <div key={l} className="glass" style={{ width: 104, padding: 12, borderRadius: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <I size={20} color={c} /><span style={{ color: T.text, fontWeight: 800, fontSize: 13 }}>{l}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: tr("Meets and communities"),
    body: tr("Find meets near you or anywhere. Join your make's community to post, discuss mods and meet people."),
    art: () => <Orbit center={<Users size={40} color="#fff" />} items={[<Calendar key="c" size={18} />, <MessageCircle key="m" size={18} />, <MapPin key="p" size={18} />]} tone={T.accent2} />,
  },
  {
    title: tr("Slide the bar"),
    body: tr("Tap the bar at the bottom, or slide your finger along it to move between Feed, Discover and your Profile."),
    art: () => (
      <div className="glass" style={{ display: "flex", gap: 6, padding: "8px 10px", borderRadius: 999 }}>
        {[Car, Compass, Plus, User].map((I, k) => (
          <div key={k} style={{ width: 50, height: 38, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: k === 0 ? T.accent : "transparent" }}>
            <I size={20} color={k === 0 ? "#fff" : T.textDim} />
          </div>
        ))}
      </div>
    ),
  },
];

export function Tour({ onDone }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const sw = useSwipe({ onLeft: () => setI((n) => Math.min(SLIDES.length - 1, n + 1)), onRight: () => setI((n) => Math.max(0, n - 1)) });
  const S = SLIDES[i];
  return (
    <div data-testid="tour" {...sw.bind} style={{ ...sw.bind.style, position: "fixed", inset: 0, zIndex: 80, background: T.bg, display: "flex", flexDirection: "column", padding: "28px 24px calc(28px + env(safe-area-inset-bottom))" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 50% at 50% 30%, rgba(230,56,70,0.22), rgba(10,10,11,0) 70%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}>
        {!last && <button onClick={onDone} style={{ background: "none", border: "none", color: T.textDim, fontSize: 14, fontWeight: 700 }}>{tr("Skip")}</button>}
      </div>
      <div key={i} className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
        <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>{S.art()}</div>
        <div className="display" data-testid="tour-title" style={{ fontSize: 28, color: T.text, marginBottom: 10 }}>{S.title}</div>
        <div style={{ color: T.textDim, fontSize: 15, lineHeight: 1.55, maxWidth: 320 }}>{S.body}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20, position: "relative" }}>
        {SLIDES.map((_, k) => <span key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 99, background: k === i ? T.accent : "rgba(255,255,255,0.25)", transition: "width .2s ease" }} />)}
      </div>
      <button onClick={() => (last ? onDone() : setI(i + 1))} className="press" style={{ position: "relative", width: "100%", padding: 15, borderRadius: 18, border: "none", background: T.accent, color: "#fff", fontWeight: 800, fontSize: 16, boxShadow: T.shadowAccent, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {last ? tr("Let's go") : tr("Next")} <ChevronRight size={18} />
      </button>
    </div>
  );
}

function Orbit({ center, items, tone = T.accent }) {
  const pos = [[-78, -40], [78, -40], [0, 86]];
  return (
    <div style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: 999, border: `1px dashed ${T.lineDark}` }} />
      <div style={{ width: 96, height: 96, borderRadius: 32, background: `linear-gradient(150deg, ${tone}, ${T.accentDeep})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>{center}</div>
      {items.map((it, k) => (
        <div key={k} className="glass" style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(calc(-50% + ${pos[k][0]}px), calc(-50% + ${pos[k][1]}px))`, width: 46, height: 46, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", color: T.text }}>{it}</div>
      ))}
    </div>
  );
}
function Phone({ children }) {
  return <div style={{ width: 92, height: 170, borderRadius: 22, border: "2px solid rgba(255,255,255,0.25)", background: "linear-gradient(160deg, rgba(230,56,70,0.5), rgba(136,30,45,0.6))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>;
}
function Gesture({ icon, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: T.text }}>
      <div className="glass" style={{ width: 46, height: 46, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <span style={{ fontSize: 11, color: T.textDim, fontWeight: 700 }}>{label}</span>
    </div>
  );
}
