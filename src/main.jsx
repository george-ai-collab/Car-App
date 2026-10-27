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

// Share tags: a carfooly:// link opened from outside (another app, or the phone's camera).
// If the app isn't ready yet, Shell picks it up when it opens.
const openTag = (text) => {
  if (!text) return;
  window.__pendingTag = text;
  window.dispatchEvent(new CustomEvent("carfooly-open-tag", { detail: text }));
  window.__pendingTag = window.__carfoolyBack ? null : text; // Shell mounted: handled now
};
if (Capacitor.isNativePlatform()) {
  CapApp.addListener("appUrlOpen", (e) => openTag(e.url));
  CapApp.getLaunchUrl().then((r) => { if (r?.url) openTag(r.url); }).catch(() => {});
  // Android can pause the app while the scanner is open; the result then arrives here.
  CapApp.addListener("appRestoredResult", (e) => {
    if (e.pluginId === "BarcodeScanner" && e.success) openTag(e.data?.barcodes?.[0]?.rawValue);
  });
}

createRoot(document.getElementById("root")).render(
  <App />
);
