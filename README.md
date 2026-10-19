# Carfooly — Android app

Carfooly is a car-culture social app: every car gets its own permanent page,
plus a feed, spotting, communities, meets and news. It's a React app wrapped
as a native Android app with [Capacitor](https://capacitorjs.com).

## Get the APK (no Android setup needed)

1. Create a free GitHub account and a new **private** repository named `carfooly`.
2. Upload everything in this folder to it (the "uploading an existing file"
   link on the empty repo page accepts the whole folder, including `.github`).
3. Open the repo's **Actions** tab. The "Build Android APK" run starts on its own;
   it takes about 5–8 minutes.
4. When it shows a green tick, open the run and download **carfooly-apk** at the
   bottom. Unzip it to get `carfooly-debug.apk`.
5. Send the APK to your phone, open it, and allow "install unknown apps" when asked.

Every later push to `main` builds a fresh APK. You can also rerun it by hand
from the Actions tab ("Run workflow").

## Build it on your own computer instead

Needs Node 20+, JDK 21 and Android Studio.

```bash
npm install
npm run build
npm run android:add      # generates android/ and adds camera permission
npx cap sync android
npm run android:open     # opens Android Studio → Run ▶ on your phone
```

After changing the UI: `npm run android:sync`.

## How changes get made

1. Changes go on a branch and open a **pull request** (never straight to `main`).
2. GitHub builds an APK for the PR and comments the download link (or the error).
3. Install it, test, then merge the PR when it's good.

## Where things live

| Folder / file | What's in it |
|---|---|
| `src/App.jsx` | Starts the app: loading → sign-up → main app |
| `src/Shell.jsx` | Decides which screen shows, the back arrow and the bottom nav |
| `src/nav/useNav.js` | Page history. Back always goes one page back; from a tab it goes to the Feed; on the Feed it leaves the app |
| `src/store/useStore.js` | All data and actions (posts, cars, meets…). The only place that saves |
| `src/storage.js` | Saves to the phone (IndexedDB). This is what Supabase replaces next |
| `src/screens/` | One file per area: Feed, Profile, Cars, Meets, Discover, Settings… |
| `src/components/` | Shared pieces: sheets, menus, photo editor, date picker, map |
| `src/theme.js` | Colours, fonts |
| `src/main.jsx` | Boots the app and wires the Android back button |
| `scripts/patch-android.mjs` | Adds camera + location permission and locks portrait |
| `.github/workflows/build-apk.yml` | Builds the APK on GitHub's servers |

## Outside services (fine for the beta, need a plan before launch)

- **Map tiles**: CARTO dark style (OpenStreetMap data). Needs a paid tile plan for a public launch.
- **Place search**: Photon (komoot). Fair-use only; swap for a paid geocoder at launch.
- **Directions** open Google Maps with the meet's pin.

## Known limits

- **Data stays on each phone** until the Supabase backend is in. To test likes and
  comments notifications, use Settings → Switch account to act as a second person.
- **Debug-signed APK.** Fine for testers; the Play Store needs a release-signed AAB.
- **Fonts** fall back to the phone's system fonts.

## Backend plan (Supabase)

`src/storage.js` (and `src/store/useStore.js`) are the swap points. Next round:
Postgres tables for users/cars/posts/meets, Supabase Auth (email + Google),
Storage for photos, and row-level security so people can only edit their own things.
