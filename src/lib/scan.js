import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { tr } from "./i18n";

// Scans a share tag with Google's built-in scanner (no camera permission needed).
// Returns { text } or { error } or {} when the person closed the scanner.
export async function scanTag() {
  if (typeof window !== "undefined" && window.__scanResult !== undefined) return window.__scanResult; // tests
  if (!Capacitor.isNativePlatform()) return { error: tr("Scanning works in the phone app.") };
  try {
    if (Capacitor.getPlatform() === "android") {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        return { error: tr("Getting the scanner ready. Try again in a few seconds.") };
      }
    }
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode], autoZoom: true });
    const text = barcodes?.[0]?.rawValue;
    return text ? { text } : {};
  } catch (e) {
    const m = (e?.message || "").toLowerCase();
    if (m.includes("cancel")) return {};
    return { error: tr("Couldn't open the scanner. Try again.") };
  }
}
