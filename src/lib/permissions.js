// When someone says "no" to a permission, explain what won't work and how to turn it back on.
// Anything can call showPermissionHelp("camera" | "photos" | "location"); the Shell shows the message.
export function showPermissionHelp(kind) {
  window.dispatchEvent(new CustomEvent("carfooly-permission", { detail: kind }));
}

// For navigator.geolocation errors: code 1 means the person (or the phone) refused location.
export function handleLocationError(err) {
  if (err && err.code === 1) { showPermissionHelp("location"); return true; }
  return false;
}

export const PERMISSION_HELP = {
  camera: {
    title: "Camera access is off",
    body: "Carfooly can't take photos without camera access. You can still choose photos from your gallery.",
    steps: "Settings → Apps → Carfooly → Permissions → Camera → Allow",
  },
  photos: {
    title: "Photo access is off",
    body: "Carfooly can't open your gallery without photo access, so you can't add photos from it.",
    steps: "Settings → Apps → Carfooly → Permissions → Photos and videos → Allow",
  },
  location: {
    title: "Location is off",
    body: "\"Use my location\" and meets near you won't work without it. You can still search for a place or city instead.",
    steps: "Settings → Apps → Carfooly → Permissions → Location → Allow while using the app",
  },
};
