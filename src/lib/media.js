import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

// On the phone app this opens Android's own photo picker, which shows your recent photos
// and an Albums tab. Resolves to a list of image Blobs ([] if you cancel).
export const canPickNatively = () => Capacitor.isNativePlatform();

export async function pickFromGallery(limit = 10) {
  try {
    const res = await Camera.pickImages({ limit, quality: 90 });
    const out = [];
    for (const p of res.photos || []) {
      const blob = await (await fetch(p.webPath)).blob();
      out.push(blob);
    }
    return out;
  } catch {
    return []; // cancelled
  }
}
