// Runs after `npx cap add android`. Adds what the Carfooly UI needs on Android:
//  - CAMERA permission, so "Take a photo" in Spot / New Post opens the camera
//  - location permission, for "Use my location" when posting a meet
//  - portrait lock, since every screen is designed for a portrait phone
//  - carfooly:// links (share tags) open the app, and the QR scanner is set up
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";

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

// Share tags: carfooly://… links open the app.
if (!xml.includes('android:scheme="carfooly"')) {
  xml = xml.replace("</activity>", `    <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="carfooly" />
            </intent-filter>
        </activity>`);
}
// Google's ready-made QR scanner (downloaded by Play services when first needed).
if (!xml.includes("com.google.mlkit.vision.DEPENDENCIES")) {
  xml = xml.replace("</application>", `    <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui" />
    </application>`);
}

writeFileSync(manifestPath, xml);

// Hide the WebView's own scrollbar and turn off its edge bounce/stretch, so every page
// stops dead at the top and bottom (the app draws its own look).
const findFile = (dir, name) => {
  for (const f of readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (statSync(p).isDirectory()) { const r = findFile(p, name); if (r) return r; }
    else if (f === name) return p;
  }
  return null;
};
const activity = findFile("android/app/src/main/java", "MainActivity.java");
if (activity) {
  const src = readFileSync(activity, "utf8");
  if (!src.includes("OVER_SCROLL_NEVER")) {
    const pkg = (src.match(/^package\s+[\w.]+;/m) || ["package com.carfooly.app;"])[0];
    writeFileSync(activity, `${pkg}

import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}
`);
  }
}
// Each GitHub build gets a higher version number, so Android treats it as an update.
const buildNo = parseInt(process.env.BUILD_NUMBER || "", 10);
const gradlePath = "android/app/build.gradle";
if (buildNo && existsSync(gradlePath)) {
  let g = readFileSync(gradlePath, "utf8");
  g = g.replace(/versionCode\s+\d+/, `versionCode ${buildNo}`).replace(/versionName\s+"[^"]*"/, `versionName "0.2.${buildNo}"`);
  writeFileSync(gradlePath, g);
}

console.log("patch-android: permissions, portrait lock, tag links, scanner, no scrollbar/bounce, version applied");
