// Read-only lists the app looks things up in: car makes/models and race tracks.
// Online they come from the database; offline/test builds use the built-in lists.
import { REMOTE } from "../backend/config";
import { sb } from "../backend/client";
import { BUILTIN_CARS, BUILTIN_MAKES } from "./carCatalog";
import { BUILTIN_TRACKS } from "./tracks";

const cache = { makes: null, models: {}, tracks: null };

// Makes, most popular first.
export async function carMakes() {
  if (cache.makes) return cache.makes;
  if (!REMOTE) return (cache.makes = BUILTIN_MAKES);
  try {
    const { data, error } = await sb().from("car_makes").select("name").order("popular", { ascending: false }).order("name");
    if (error || !data?.length) throw error || new Error("empty");
    return (cache.makes = data.map((r) => r.name));
  } catch { return BUILTIN_MAKES; }
}

// Models of one make, A to Z (the built-in popular ones first when offline).
export async function carModels(make) {
  if (!make) return [];
  if (cache.models[make]) return cache.models[make];
  if (!REMOTE) return (cache.models[make] = BUILTIN_CARS[make] || []);
  try {
    const { data, error } = await sb().from("car_models").select("model,source").eq("make", make).limit(2000);
    if (error) throw error;
    // Hand-picked (popular) ones first, then the rest A to Z.
    const rank = (r) => (r.source === "vpic" ? 1 : 0);
    const list = data.sort((a, b) => rank(a) - rank(b) || a.model.localeCompare(b.model)).map((r) => r.model);
    return (cache.models[make] = list);
  } catch { return BUILTIN_CARS[make] || []; }
}

// "My car isn't in the list."
const REQ_KEY = "carfooly-car-requests";
export async function requestCar({ make, model, year }) {
  const row = { make: make.trim().slice(0, 30), model: model.trim().slice(0, 40), year: /^\d{4}$/.test(year || "") ? year : "" };
  if (REMOTE) {
    const { error } = await sb().from("car_model_requests").insert(row);
    if (error) throw error;
    return;
  }
  let list = [];
  try { const r = await window.storage.get(REQ_KEY, true); list = r ? JSON.parse(r.value) : []; } catch { /* empty */ }
  list.push({ ...row, id: crypto.randomUUID(), status: "open", date: new Date().toISOString() });
  await window.storage.set(REQ_KEY, JSON.stringify(list), true);
}

// Admins: open requests, and adding one to the list.
export async function openCarRequests() {
  if (REMOTE) {
    const { data } = await sb().from("car_model_requests").select("id,make,model,year,created_at").eq("status", "open").order("created_at").limit(100);
    return (data || []).map((r) => ({ ...r, date: r.created_at }));
  }
  try { const r = await window.storage.get(REQ_KEY, true); return (r ? JSON.parse(r.value) : []).filter((x) => x.status === "open"); } catch { return []; }
}
export async function resolveCarRequest(req, add) {
  if (REMOTE) {
    const { error } = await sb().rpc("resolve_car_request", { p_id: req.id, p_add: add });
    if (error) throw error;
  } else {
    let list = [];
    try { const r = await window.storage.get(REQ_KEY, true); list = r ? JSON.parse(r.value) : []; } catch { /* empty */ }
    list = list.map((x) => (x.id === req.id ? { ...x, status: add ? "added" : "rejected" } : x));
    await window.storage.set(REQ_KEY, JSON.stringify(list), true);
    if (add) { (BUILTIN_CARS[req.make] ||= []).push(req.model); if (!BUILTIN_MAKES.includes(req.make)) BUILTIN_MAKES.push(req.make); }
  }
  delete cache.models[req.make]; cache.makes = null;
}

// Race tracks, karting and drag strips.
export async function tracks() {
  if (cache.tracks) return cache.tracks;
  if (!REMOTE) return (cache.tracks = BUILTIN_TRACKS);
  try {
    const { data, error } = await sb().from("tracks").select("*");
    if (error || !data?.length) throw error || new Error("empty");
    return (cache.tracks = data);
  } catch { return BUILTIN_TRACKS; }
}

// News: ask the server to fetch new headlines if they're old (it decides; at most every 3 hours).
export function refreshNews() {
  if (!REMOTE) return Promise.resolve();
  return sb().functions.invoke("news-refresh", { body: {} }).catch(() => {});
}
