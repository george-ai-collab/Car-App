import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

// Tracks how much of the screen the on-screen keyboard is covering (in CSS px),
// so sheets and inputs can sit right on top of it.
//
// Two sources, whichever is bigger wins:
//  - on the phone app: the Keyboard plugin tells us the keyboard height
//  - in a browser: visualViewport shrinks when the keyboard opens
// If Android already shrank the whole page to make room, we subtract that so
// the box isn't pushed up twice.

let baseHeight = typeof window !== "undefined" ? window.innerHeight : 0;
let nativeKb = 0;
const listeners = new Set();

function current() {
  let web = 0;
  const vv = window.visualViewport;
  if (vv) web = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  const alreadyShrunk = Math.max(0, baseHeight - window.innerHeight);
  const native = Math.max(0, nativeKb - alreadyShrunk);
  const kb = Math.max(web, native);
  return kb < 60 ? 0 : Math.round(kb); // ignore tiny changes (toolbars, rounding)
}

function emit() {
  const v = current();
  listeners.forEach((fn) => fn(v));
  if (v) setTimeout(() => reveal(document.activeElement), 80); // after pages add room for it
}

// Move the box you're typing in so it sits just above the keyboard (not behind it).
export function reveal(el) {
  if (!el?.matches?.("input, textarea") || el.closest("[data-sheet]")) return;
  const kb = current();
  const r = el.getBoundingClientRect();
  const visibleBottom = window.innerHeight - kb - 24;
  const visibleTop = 70;
  let delta = 0;
  if (r.bottom > visibleBottom) delta = r.bottom - visibleBottom;
  else if (r.top < visibleTop) delta = r.top - visibleTop;
  if (!delta) return;
  // Scroll whichever box actually scrolls: a full-screen panel, or the page.
  let box = el.parentElement;
  while (box && box !== document.body) {
    const st = getComputedStyle(box);
    if (/(auto|scroll)/.test(st.overflowY) && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  if (box && box !== document.body) box.scrollBy({ top: delta, behavior: "smooth" });
  else window.scrollBy({ top: delta, behavior: "smooth" });
}

let installed = false;
function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.visualViewport?.addEventListener("resize", emit);
  window.visualViewport?.addEventListener("scroll", emit);
  window.addEventListener("resize", () => {
    if (!nativeKb && !document.activeElement?.matches?.("input, textarea")) baseHeight = window.innerHeight;
    emit();
  });
  if (Capacitor.isNativePlatform()) {
    const show = (info) => { nativeKb = info?.keyboardHeight || 0; setTimeout(emit, 0); setTimeout(emit, 250); };
    Keyboard.addListener("keyboardWillShow", show);
    Keyboard.addListener("keyboardDidShow", show);
    Keyboard.addListener("keyboardWillHide", () => { nativeKb = 0; emit(); });
    Keyboard.addListener("keyboardDidHide", () => { nativeKb = 0; baseHeight = window.innerHeight; emit(); });
  }
  // When you tap a text box on a normal page, scroll it into view above the keyboard.
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!el.matches?.("input, textarea") || el.closest("[data-sheet]")) return;
    setTimeout(() => reveal(el), 320);
  });
}

export function useKeyboardOffset() {
  const [kb, setKb] = useState(0);
  useEffect(() => {
    install();
    listeners.add(setKb);
    setKb(current());
    return () => listeners.delete(setKb);
  }, []);
  return kb;
}

export function initKeyboard() {
  install();
  // Tests on a computer have no keyboard: let them pretend one is open.
  if (!Capacitor.isNativePlatform()) window.__fakeKeyboard = (h) => { nativeKb = h; emit(); };
}
