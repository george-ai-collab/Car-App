import { useRef, useState } from "react";

// Sideways swipe detection that leaves normal up/down scrolling alone.
//   const sw = useSwipe({ onLeft, onRight });  <div {...sw.bind}>  (sw.dx = live drag distance)
// "onLeft" = finger moves left, "onRight" = finger moves right.
// Ignores swipes that start at the very edge of the screen (that's Android's back gesture)
// and anything inside an element marked data-noswipe (maps, the photo editor…).

const EDGE = 24;      // px from the screen edge reserved for the system back gesture
const LOCK = 10;      // px of movement before we decide sideways vs up/down

export function useSwipe({ onLeft, onRight, threshold = 60, enabled = true } = {}) {
  const s = useRef(null);
  const swiped = useRef(false);
  const [dx, setDx] = useState(0);

  const start = (e) => {
    if (!enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (e.target.closest?.("[data-noswipe], input, textarea, select")) return;
    if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return;
    s.current = { x: e.clientX, y: e.clientY, axis: null, id: e.pointerId };
    swiped.current = false;
  };
  const move = (e) => {
    const st = s.current;
    if (!st || st.id !== e.pointerId) return;
    const mx = e.clientX - st.x, my = e.clientY - st.y;
    if (!st.axis) {
      if (Math.abs(mx) < LOCK && Math.abs(my) < LOCK) return;
      st.axis = Math.abs(mx) > Math.abs(my) * 1.3 ? "x" : "y";
      if (st.axis === "x") { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
    }
    if (st.axis === "x") setDx(mx);
  };
  const end = (e) => {
    const st = s.current;
    s.current = null;
    if (!st || st.axis !== "x") { setDx(0); return; }
    const mx = e.clientX - st.x;
    setDx(0);
    if (mx <= -threshold && onLeft) { swiped.current = true; onLeft(); }
    else if (mx >= threshold && onRight) { swiped.current = true; onRight(); }
  };
  const cancel = () => { s.current = null; setDx(0); };
  // A swipe shouldn't also count as a tap on whatever the finger started on.
  const clickCapture = (e) => {
    if (swiped.current) { swiped.current = false; e.stopPropagation(); e.preventDefault(); }
  };

  return {
    dx,
    bind: {
      onPointerDown: start, onPointerMove: move, onPointerUp: end, onPointerCancel: cancel,
      onClickCapture: clickCapture,
      style: { touchAction: "pan-y" },
    },
  };
}
