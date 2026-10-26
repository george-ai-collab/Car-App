import { useCallback, useRef, useState } from "react";
import { BODY_STACK, T } from "./theme";
import { useStore } from "./store/useStore";
import { GlobalStyle, LoadingScreen, UsersContext } from "./components/ui";
import { Onboarding } from "./screens/Onboarding";
import { Shell } from "./Shell";

// Entry point: loads data, then shows sign-up or the app.
// Screens live in src/screens, shared pieces in src/components, data in src/store.
export default function App() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  const store = useStore(flash);

  return (
    <UsersContext.Provider value={store.users}>
      <div style={{ fontFamily: BODY_STACK, background: T.bg, minHeight: "100vh" }}>
        <GlobalStyle />
        {store.loading ? (
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
