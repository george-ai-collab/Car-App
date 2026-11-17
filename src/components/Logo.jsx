// The app logo (temporary: the lizard the founder drew). White lizard on the red brand tile.
import logoWhite from "../assets/logo-white.png";
import logoTile from "../assets/logo-tile.png";
import { useEffect, useState } from "react";
import { T } from "../theme";

export { logoWhite, logoTile };

export function LogoTile({ size = 72, glow = true, style }) {
  return (
    <div data-testid="app-logo" style={{
      width: size, height: size, borderRadius: size / 3, background: `linear-gradient(150deg, ${T.accent}, ${T.accentDeep})`,
      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: glow ? "0 12px 40px rgba(230,56,70,0.45)" : "none", ...style,
    }}>
      <img src={logoWhite} alt="" draggable={false} style={{ width: "70%", height: "70%", objectFit: "contain", display: "block" }} />
    </div>
  );
}

// Opening the app: the lizard spins in (chasing its tail) over the feed, then fades away.
// Shown once per app launch; it never blocks taps.
let introShown = false;
export function LogoIntro() {
  const [show] = useState(() => { if (introShown || window.__noIntro) return false; introShown = true; return true; });
  const [gone, setGone] = useState(false);
  useEffect(() => { if (show) { const t = setTimeout(() => setGone(true), 2100); return () => clearTimeout(t); } }, [show]);
  if (!show || gone) return null;
  return (
    <div data-testid="logo-intro" aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(circle at 50% 50%, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.85) 45%, rgba(10,10,11,0.6) 100%)`,
      animation: "introOut 2.1s ease forwards",
    }}>
      <img src={logoWhite} alt="" style={{ width: 128, height: 128, animation: "lizardIntro 1s cubic-bezier(.2,.8,.2,1) both", filter: "drop-shadow(0 6px 24px rgba(230,56,70,0.55))" }} />
    </div>
  );
}
