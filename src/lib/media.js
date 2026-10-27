import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { showPermissionHelp } from "./permissions";

// Photos on the phone go through the Camera plugin, so we can tell when access was refused.
export const canPickNatively = () => Capacitor.isNativePlatform();
const refused = (e) => /denied|permission|not authorized/i.test(String(e?.message || e || ""));

// Android's photo picker (recent photos + albums). Resolves to image Blobs ([] if cancelled).
export async function pickFromGallery(limit = 10) {
  try {
    const res = await Camera.pickImages({ limit, quality: 90 });
    const out = [];
    for (const p of res.photos || []) out.push(await (await fetch(p.webPath)).blob());
    return out;
  } catch (e) {
    if (refused(e)) showPermissionHelp("photos");
    return [];
  }
}

// Take one photo with the camera. Resolves to a Blob, or null if cancelled / not allowed.
export async function takePhoto() {
  try {
    const perm = await Camera.checkPermissions().catch(() => null);
    if (perm && perm.camera === "denied") { showPermissionHelp("camera"); return null; }
    const p = await Camera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.Uri, quality: 90, saveToGallery: false });
    return await (await fetch(p.webPath)).blob();
  } catch (e) {
    if (refused(e)) showPermissionHelp("camera");
    return null;
  }
}
