import { createRoot } from "react-dom/client";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { installStorage } from "./storage";
import { initKeyboard } from "./lib/keyboard";
import App from "./App.jsx";

installStorage();
initKeyboard();

// Android hardware/gesture back: close an open sheet first, then use the app's
// own back arrow, otherwise send the app to the background (like Instagram).
if (Capacitor.isNativePlatform()) {
  CapApp.addListener("backButton", () => {
    const backdrops = document.querySelectorAll("[data-sheet-backdrop]");
    if (backdrops.length) return backdrops[backdrops.length - 1].click(); // top-most sheet
    // Go back one page; on the Feed there's nowhere to go, so leave the app.
    if (window.__carfoolyBack && window.__carfoolyBack()) return;
    CapApp.minimizeApp();
  });
}

createRoot(document.getElementById("root")).render(
  <App />
);
