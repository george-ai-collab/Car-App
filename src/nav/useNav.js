import { useCallback, useRef, useState } from "react";

// Navigation works like a stack of pages.
// - go()     opens a page on top (back returns to where you were)
// - tab()    switches bottom-nav tab: the stack becomes [Feed, that tab]
// - back()   removes the top page; returns false when already on the Feed
// - replace() swaps the top page (e.g. "Add car" form -> the new car's page)
// - patch()  remembers small things about the current page (like which profile tab is open)
// Every page remembers its scroll position, so going back lands exactly where you were.

let counter = 0;
const entry = (view, params = {}, root = false) => ({ key: `${view}-${++counter}`, view, params, root, scrollY: 0 });

export const TAB_VIEWS = ["feed", "discover", "profile"];

export function useNav() {
  const [stack, setStack] = useState(() => [entry("feed", {}, true)]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const saveScroll = (list) => {
    const top = list[list.length - 1];
    if (top) top.scrollY = window.scrollY;
  };

  const update = useCallback((fn) => {
    setStack((prev) => {
      saveScroll(prev);
      const next = fn(prev);
      stackRef.current = next;
      return next;
    });
  }, []);

  const go = useCallback((view, params) => update((s) => [...s, entry(view, params)]), [update]);

  const tab = useCallback((view, params) => update((s) => {
    if (view === "feed") return [s[0]];
    const top = s[s.length - 1];
    // Tapping the tab you're already on (at its root) does nothing.
    if (s.length === 2 && top.root && top.view === view && JSON.stringify(top.params) === JSON.stringify(params || {})) return s;
    return [s[0], entry(view, params, true)];
  }), [update]);

  const back = useCallback(() => {
    if (stackRef.current.length <= 1) return false;
    update((s) => (s.length > 1 ? s.slice(0, -1) : s));
    return true;
  }, [update]);

  const replace = useCallback((view, params) => update((s) => [...s.slice(0, -1), entry(view, params, s[s.length - 1].root)]), [update]);

  const reset = useCallback(() => update((s) => [s[0]]), [update]);

  const patch = useCallback((params) => setStack((s) => {
    const top = s[s.length - 1];
    const next = [...s.slice(0, -1), { ...top, params: { ...top.params, ...params } }];
    stackRef.current = next;
    return next;
  }), []);

  const current = stack[stack.length - 1];
  return { stack, current, go, tab, back, replace, reset, patch };
}
