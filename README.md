# Carfooly — Android app

The Carfooly beta frontend, unchanged, wrapped as a native Android app with
[Capacitor](https://capacitorjs.com). `src/App.jsx` is the exact beta code; the
only additions are two invisible `data-` attributes so Android's back gesture
behaves like the in-app back arrow.

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

## How it works

| Piece | What it does |
|---|---|
| `src/App.jsx` | The beta UI, as-is |
| `src/storage.js` | Replaces the chat preview's `window.storage` with on-phone IndexedDB |
| `src/main.jsx` | Boots the app and wires the Android back button |
| `scripts/patch-android.mjs` | Adds camera permission and locks portrait |
| `.github/workflows/build-apk.yml` | Builds the APK on GitHub's servers |

## Known limits of this first build

- **Data stays on each phone.** Posts, cars, follows etc. are saved locally, so
  two phones won't see each other's content until the backend exists. Testers
  will each be in their own empty world.
- **Debug-signed APK.** Fine for sideloading to testers; the Play Store needs a
  release-signed build (a later step).
- **Fonts** fall back to the phone's system fonts, the same way they did in the
  chat preview. Bundle the font files if you want them pinned.

## Backend plan (Azure)

`src/storage.js` is the single swap point. The rest of the app never talks to
storage directly, so moving to a real backend means rewriting that one file to
call an API.

Suggested Azure pieces:

- **Azure Container Apps or App Service** — the API server
- **Azure Database for PostgreSQL** — users, cars, posts, follows, meets
- **Azure Blob Storage** — photos (instead of storing them inside records)
- **Microsoft Entra External ID** — sign-up / log-in with unique handles
- **Notification Hubs** — push notifications for likes, spots, comments
- **Azure AI Vision** — later: automatic plate blurring and spot verification
