// The app logo (temporary: the lizard the founder drew). White lizard on the red brand tile.
import logoWhite from "../assets/logo-white.png";
import logoTile from "../assets/logo-tile.png";
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
