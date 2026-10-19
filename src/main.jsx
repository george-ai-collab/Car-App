import { createRoot } from "react-dom/client";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { installStorage } from "./storage";
import App from "./App.jsx";

installStorage();

// Android hardware/gesture back: close an open sheet first, then use the app's
// own back arrow, otherwise send the app to the background (like Instagram).
if (Capacitor.isNativePlatform()) {
  CapApp.addListener("backButton", () => {
    const backdrop = document.querySelector("[data-sheet-backdrop]");
    if (backdrop) return backdrop.click();
    const back = document.querySelector("[data-nav-back]");
    if (back) return back.click();
    CapApp.minimizeApp();
  });
}

createRoot(document.getElementById("root")).render(
  <App />
);
