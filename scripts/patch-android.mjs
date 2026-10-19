// Runs after `npx cap add android`. Adds what the Carfooly UI needs on Android:
//  - CAMERA permission, so "Take a photo" in Spot / New Post opens the camera
//  - location permission, for "Use my location" when posting a meet
//  - portrait lock, since every screen is designed for a portrait phone
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
if (!existsSync(manifestPath)) {
  console.error(`patch-android: ${manifestPath} not found. Run "npx cap add android" first.`);
  process.exit(1);
}

let xml = readFileSync(manifestPath, "utf8");

const additions = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
];
for (const line of additions) {
  if (!xml.includes(line)) xml = xml.replace("</manifest>", `    ${line}\n</manifest>`);
}

if (!xml.includes('android:screenOrientation=')) {
  xml = xml.replace(/<activity\b/, '<activity\n            android:screenOrientation="portrait"');
}

writeFileSync(manifestPath, xml);
console.log("patch-android: camera + location permissions and portrait lock applied");
