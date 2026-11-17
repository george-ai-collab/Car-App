import { useCallback, useEffect, useRef, useState } from "react";
import { BODY_STACK, T } from "./theme";
import { useStore } from "./store/useStore";
import { GlobalStyle, LoadingScreen, UsersContext } from "./components/ui";
import { Onboarding } from "./screens/Onboarding";
import { Shell } from "./Shell";
import { hasChosenLanguage, tr } from "./lib/i18n";
import { LanguageScreen } from "./components/LanguagePicker";

// Entry point: loads data, then shows sign-up or the app.
// Screens live in src/screens, shared pieces in src/components, data in src/store.
export default function App() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const flash = useCallback((msg) => {
    setToast(typeof msg === "string" ? tr(msg) : msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  const store = useStore(flash);
  // Any part of the app can show a short message: window.dispatchEvent(new CustomEvent("carfooly-flash", { detail: "…" }))
  useEffect(() => {
    const on = (e) => flash(e.detail);
    window.addEventListener("carfooly-flash", on);
    return () => window.removeEventListener("carfooly-flash", on);
  }, [flash]);

  return (
    <UsersContext.Provider value={store.users}>
      <div style={{ fontFamily: BODY_STACK, background: T.bg, minHeight: "100vh" }}>
        <GlobalStyle />
        {!hasChosenLanguage() && !window.__skipLanguage ? (
          // first open: pick a language (the app restarts in it)
          <LanguageScreen />
        ) : store.loading ? (
          <LoadingScreen />
        ) : !store.me ? (
          <Onboarding onSubmit={store.actions.claimUsername} users={store.users} remote={store.remote} actions={store.actions} />
        ) : (
          // key: switching accounts starts fresh navigation
          <Shell key={store.me} store={store} toast={toast} />
        )}
      </div>
    </UsersContext.Provider>
  );
}
