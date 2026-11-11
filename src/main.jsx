import { createRoot } from "react-dom/client";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { installStorage } from "./storage";
import { initKeyboard } from "./lib/keyboard";
import { applyLanguage, tr } from "./lib/i18n";
import { applyFonts } from "./lib/fonts";
import App from "./App.jsx";

installStorage();
initKeyboard();
applyLanguage();
applyFonts();

// Android hardware/gesture back: close an open sheet first, then use the app's
// own back arrow, otherwise send the app to the background (like Instagram).
// On the Feed or the sign-in screen there's nowhere to go back to: the first press only shows
// "Press back again to exit", so a stray swipe doesn't close the app.
let lastExitPress = 0;
function exitHint() {
  document.getElementById("exit-hint")?.remove();
  const el = document.createElement("div");
  el.id = "exit-hint";
  el.textContent = tr("Press back again to exit");
  el.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:100;background:#F5F4F2;color:#141414;padding:10px 18px;border-radius:999px;font:600 13.5px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.3);white-space:nowrap;pointer-events:none";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
function handleBack() {
  const backdrops = document.querySelectorAll("[data-sheet-backdrop]");
  if (backdrops.length) return backdrops[backdrops.length - 1].click(); // top-most sheet
  if (window.__carfoolyBack && window.__carfoolyBack()) return; // back one page
  const now = Date.now();
  if (now - lastExitPress < 2000) { document.getElementById("exit-hint")?.remove(); CapApp.minimizeApp(); return; }
  lastExitPress = now;
  exitHint();
}
window.__hwBack = handleBack; // tests
if (Capacitor.isNativePlatform()) CapApp.addListener("backButton", handleBack);

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
