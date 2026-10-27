import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

// Share (or save) a picture made in the app. png = "data:image/png;base64,…".
// Phones: the share sheet (which also has "Save"). Browsers: share, or download the picture.
// Returns "shared" | "saved" | "cancelled" | "failed".
export async function shareImage({ png, name, text }) {
  const base64 = png.split(",")[1];
  try {
    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
      await Share.share({ title: "Carfooly", text, files: [file.uri], dialogTitle: "Share tag" });
      return "shared";
    }
    const blob = await (await fetch(png)).blob();
    const f = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], text });
      return "shared";
    }
    const a = document.createElement("a");
    a.href = png; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    return "saved";
  } catch (e) {
    const m = (e?.message || "").toLowerCase();
    return m.includes("cancel") || e?.name === "AbortError" ? "cancelled" : "failed";
  }
}
