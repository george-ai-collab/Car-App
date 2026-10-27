// Distance + "my area" helpers for Near you / Worldwide meets.

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
