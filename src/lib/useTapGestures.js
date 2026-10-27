import { useRef } from "react";

// Double-tap and press-and-hold on an area, ignoring buttons and text boxes inside it.
//   <div {...useTapGestures({ onDoubleTap: (x, y) => …, onHold: () => … })}>
// x, y = where the second tap landed, relative to the area.
const MOVE = 12, HOLD_MS = 480, DOUBLE_MS = 300;

export function useTapGestures({ onDoubleTap, onHold }) {
  const st = useRef({ last: 0, lx: 0, ly: 0, timer: null, down: null, held: false });
  const skip = (e) => !!e.target.closest?.("button, a, input, textarea, select, [data-notap]");

  const clear = () => { clearTimeout(st.current.timer); st.current.timer = null; };
  return {
    onPointerDown: (e) => {
      if (skip(e)) return;
      const s = st.current;
      s.down = { x: e.clientX, y: e.clientY, t: Date.now() };
      s.held = false;
      clear();
      if (onHold) s.timer = setTimeout(() => { s.held = true; s.down = null; try { navigator.vibrate && navigator.vibrate(12); } catch { /* ignore */ } onHold(); }, HOLD_MS);
    },
    onPointerMove: (e) => {
      const d = st.current.down;
      if (d && (Math.abs(e.clientX - d.x) > MOVE || Math.abs(e.clientY - d.y) > MOVE)) { clear(); st.current.down = null; }
    },
    onPointerUp: (e) => {
      const s = st.current;
      clear();
      const d = s.down;
      s.down = null;
      if (!d || s.held || Date.now() - d.t > 350) return;
      const now = Date.now();
      if (onDoubleTap && now - s.last < DOUBLE_MS && Math.abs(e.clientX - s.lx) < 40 && Math.abs(e.clientY - s.ly) < 40) {
        s.last = 0;
        const r = e.currentTarget.getBoundingClientRect();
        onDoubleTap(e.clientX - r.left, e.clientY - r.top);
      } else {
        s.last = now; s.lx = e.clientX; s.ly = e.clientY;
      }
    },
    onPointerCancel: () => { clear(); st.current.down = null; },
    onContextMenu: (e) => { if (onHold) e.preventDefault(); },
  };
}
