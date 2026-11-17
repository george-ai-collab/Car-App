// Maps and place search, in one place, so the provider can be swapped without touching screens.
// With a Geoapify key (VITE_GEOAPIFY_KEY at build time) we use Geoapify: free for 3,000
// requests a day, allowed in apps, and it answers in Arabic too.
// Without a key we fall back to the free community services (Photon search + CARTO tiles),
// which are fine for testing but are "fair use" only, with no promise they stay up.
import { lang } from "./i18n";

const KEY = (import.meta.env && import.meta.env.VITE_GEOAPIFY_KEY) || "";
export const GEO_PROVIDER = KEY ? "geoapify" : "photon";

export const TILES = KEY
  ? { url: `https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${KEY}`, attribution: "Powered by Geoapify | © OpenMapTiles © OpenStreetMap contributors", subdomains: "abc" }
  : { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: "© OpenStreetMap contributors © CARTO", subdomains: "abcd" };

// Both services describe a place with the same kind of fields (name, street, city, country...).
const fromGeoapify = (p) => ({
  name: p.name || "", housenumber: p.housenumber, street: p.street, district: p.district || p.suburb,
  city: p.city, county: p.county, state: p.state, country: p.country,
  type: p.result_type === "city" ? "city" : p.result_type, osm_value: p.result_type,
});

// City + country of a place, so meets can be grouped and found "near you".
export function placeArea(p) {
  const isTown = ["city", "town", "village"].includes(p.type) || ["city", "town", "village"].includes(p.osm_value);
  return { city: p.city || (isTown ? p.name : "") || p.county || p.state || "", country: p.country || "" };
}

export function labelFor(p) {
  const parts = [];
  if (p.name) parts.push(p.name);
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  if (street && street !== p.name) parts.push(street);
  [p.city || p.district, p.state, p.country].forEach((x) => { if (x && !parts.includes(x)) parts.push(x); });
  return parts.join(", ");
}

const toResult = (props, lat, lng) => ({ label: labelFor(props), ...placeArea(props), lat, lng });

// Places matching what was typed. near = {lat, lng} to prefer close results; cities = only towns/cities.
export async function searchPlaces(q, { near, cities = false, limit = 5 } = {}) {
  const text = encodeURIComponent(q.trim());
  if (KEY) {
    const bias = near ? `&bias=proximity:${near.lng},${near.lat}` : "";
    const type = cities ? "&type=city" : "";
    const r = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${text}&limit=${limit}&lang=${lang}${bias}${type}&apiKey=${KEY}`);
    if (!r.ok) throw new Error("search " + r.status);
    const j = await r.json();
    return (j.features || []).map((f) => toResult(fromGeoapify(f.properties || {}), f.properties.lat, f.properties.lon)).filter((x) => x.label);
  }
  const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : "";
  const type = cities ? "&layer=city&layer=state" : "";
  const r = await fetch(`https://photon.komoot.io/api/?q=${text}&limit=${limit}${bias}${type}`);
  const j = await r.json();
  return (j.features || []).map((f) => toResult(f.properties || {}, f.geometry.coordinates[1], f.geometry.coordinates[0])).filter((x) => x.label);
}

// What's at a spot on the map: { label, city, country } or null.
export async function reversePlace(lat, lng) {
  if (KEY) {
    const r = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&lang=${lang}&apiKey=${KEY}`);
    const p = (await r.json()).features?.[0]?.properties;
    return p ? toResult(fromGeoapify(p), lat, lng) : null;
  }
  const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
  const p = (await r.json()).features?.[0]?.properties;
  return p ? toResult(p, lat, lng) : null;
}

export function directionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// ---- Distance + "my area" helpers for Near you / Worldwide meets and tracks ----

export const NEAR_KM = 150;

export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return Infinity;
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Is this meet near the area the person picked?
export function isNear(meet, area) {
  if (!area) return false;
  if (meet.lat != null && meet.lng != null && area.lat != null) return distanceKm(meet, area) <= NEAR_KM;
  return !!(meet.city && area.city && meet.city.toLowerCase() === area.city.toLowerCase());
}

// The area is private to this phone/person (not shared with anyone).
const AREA_KEY = "carfooly-area";
export async function loadArea() {
  try { const r = await window.storage.get(AREA_KEY, false); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
export async function saveArea(area) {
  try { await window.storage.set(AREA_KEY, JSON.stringify(area), false); } catch { /* not critical */ }
}
