import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

// Opens the phone's share sheet (WhatsApp, Instagram, Messages…). In a browser it uses the
// browser's share, or copies the text. Proper links into the app come with the online version.
export async function shareText({ title, text }) {
  try {
    if (Capacitor.isNativePlatform()) { await Share.share({ title, text, dialogTitle: "Share" }); return "shared"; }
    if (navigator.share) { await navigator.share({ title, text }); return "shared"; }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "cancelled";
  }
}
