// Carfooly storage adapter.
//
// The beta was written against the artifact runtime's `window.storage` API:
//   get(key, shared) -> Promise<{ value } | null>
//   set(key, value, shared) -> Promise<void>
//
// In the Android app this is backed by IndexedDB on the phone, so the UI code
// stays byte-for-byte identical to the beta. IndexedDB is used instead of
// localStorage because posts store compressed photos, which would quickly blow
// past localStorage's ~5 MB cap.
//
// IMPORTANT: data here lives on ONE device only. "shared" keys (cars, posts,
// users, ...) are not synced between phones yet. When the Azure backend exists,
// replace `remoteAdapter` below with real API calls for shared keys and leave
// the private keys (like the signed-in handle) on-device.

const DB_NAME = "carfooly";
const STORE = "kv";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise = null;
const db = () => (dbPromise ??= openDb());

function tx(mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req?.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

// Shared and private keys are namespaced separately so the backend swap is a
// matter of routing the "shared" branch elsewhere.
const fullKey = (key, shared) => `${shared ? "shared" : "private"}:${key}`;

const localAdapter = {
  async get(key, shared = false) {
    const value = await tx("readonly", (s) => s.get(fullKey(key, shared)));
    return value === undefined ? null : { key, value, shared };
  },
  async set(key, value, shared = false) {
    await tx("readwrite", (s) => s.put(value, fullKey(key, shared)));
    return { key, value, shared };
  },
  async delete(key, shared = false) {
    await tx("readwrite", (s) => s.delete(fullKey(key, shared)));
    return { key, deleted: true, shared };
  },
  async list(prefix = "", shared = false) {
    const ns = fullKey(prefix, shared);
    const keys = await tx("readonly", (s) => s.getAllKeys());
    return { keys: (keys || []).filter((k) => k.startsWith(ns)).map((k) => k.slice(k.indexOf(":") + 1)), shared };
  },
};

// Swap point for the Azure backend (see README).
// const remoteAdapter = { get, set, delete, list } calling your API...

export function installStorage() {
  if (!window.storage) window.storage = localAdapter;
}
