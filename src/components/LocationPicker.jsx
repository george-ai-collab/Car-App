import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, LocateFixed, Loader2 } from "lucide-react";
import { T } from "../theme";
import { handleLocationError } from "../lib/permissions";

// Map tiles: CARTO's dark style (built on OpenStreetMap). Free for a small beta;
// before a public launch we need a paid tile plan (e.g. CARTO, MapTiler or Stadia).
const TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = "© OpenStreetMap contributors © CARTO";
// Place search: Photon (OpenStreetMap data). Same note as above for launch.
const SEARCH = "https://photon.komoot.io/api/";
const REVERSE = "https://photon.komoot.io/reverse";

export function directionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

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

export function LeafletMap({ pin, onPick, height = 220, interactive = true }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const m = L.map(el.current, {
      zoomControl: false, attributionControl: true,
      dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: false, keyboard: false,
    });
    m.setView(pin ? [pin.lat, pin.lng] : [20, 0], pin ? 15 : 2);
    L.tileLayer(TILES, { attribution: ATTRIBUTION, subdomains: "abcd", maxZoom: 20 }).addTo(m);
    if (interactive) m.on("click", (e) => pickRef.current && pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    // The page fades in, so the map needs a nudge once it has its real size.
    const t = setTimeout(() => m.invalidateSize(), 300);
    return () => { clearTimeout(t); m.remove(); map.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pin) {
      if (marker.current) { marker.current.remove(); marker.current = null; }
      return;
    }
    const ll = [pin.lat, pin.lng];
    if (!marker.current) {
      marker.current = L.circleMarker(ll, { radius: 9, color: "#fff", weight: 3, fillColor: T.accent, fillOpacity: 1 }).addTo(m);
    } else {
      marker.current.setLatLng(ll);
    }
    m.setView(ll, Math.max(m.getZoom(), 15));
  }, [pin?.lat, pin?.lng]);

  return <div ref={el} data-testid="map" style={{ height, borderRadius: 18, overflow: "hidden", border: `1px solid ${T.lineDark}`, background: "#1a1a1d", zIndex: 0, position: "relative" }} />;
}

// value: { location, lat, lng }. Search, tap the map, or use your current location.
export function LocationPicker({ value, onChange }) {
  const [query, setQuery] = useState(value?.location || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const skipSearch = useRef(true);
  const pin = value?.lat != null && value?.lng != null ? { lat: value.lat, lng: value.lng } : null;

  // Search as you type, but wait until typing pauses.
  useEffect(() => {
    if (skipSearch.current) { skipSearch.current = false; return; }
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const bias = pin ? `&lat=${pin.lat}&lon=${pin.lng}` : "";
        const res = await fetch(`${SEARCH}?q=${encodeURIComponent(q)}&limit=5${bias}`);
        const json = await res.json();
        if (!cancelled) {
          setResults((json.features || []).map((f) => ({ label: labelFor(f.properties || {}), ...placeArea(f.properties || {}), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] })).filter((r) => r.label));
          setError("");
        }
      } catch {
        if (!cancelled) { setResults([]); setError("Search isn't reachable right now. You can still tap the map."); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const setText = (text) => {
    setQuery(text);
    onChange({ ...value, location: text });
  };

  const choose = (r) => {
    skipSearch.current = true;
    setQuery(r.label);
    setResults([]);
    onChange({ location: r.label, lat: r.lat, lng: r.lng, city: r.city, country: r.country });
  };

  // Tapping the map drops a pin and looks up the address for it.
  const pickPoint = async ({ lat, lng }) => {
    onChange({ ...value, location: query, lat, lng });
    try {
      const res = await fetch(`${REVERSE}?lat=${lat}&lon=${lng}`);
      const json = await res.json();
      const props = json.features?.[0]?.properties || {};
      const label = json.features?.[0] ? labelFor(props) : "";
      const text = label || `Pinned spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      skipSearch.current = true;
      setQuery(text);
      setResults([]);
      onChange({ location: text, lat, lng, ...placeArea(props) });
    } catch {
      if (!query.trim()) {
        const text = `Pinned spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        skipSearch.current = true;
        setQuery(text);
        onChange({ ...value, location: text, lat, lng });
      }
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Location isn't available on this device."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); setError(""); pickPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      (err) => { setLocating(false); if (!handleLocationError(err)) setError("Couldn't get your location right now. Try again, or search instead."); else setError("Location is off for Carfooly. Search for the place instead, or turn location on."); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textDim, display: "flex" }}>
          {searching ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={14} />}
        </div>
        <input value={query} onChange={(e) => setText(e.target.value)} placeholder="Search a place or address" maxLength={120}
          style={{ width: "100%", padding: "11px 14px 11px 34px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, color: T.text, fontSize: 14.5, outline: "none" }} />
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 6, borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface, overflow: "hidden" }}>
          {results.map((r, i) => (
            <button key={i} data-testid="place-result" onClick={() => choose(r)} style={{
              width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px", background: "none", border: "none",
              borderTop: i ? `1px solid ${T.lineDark}` : "none", color: T.text, fontSize: 13.5, textAlign: "left", lineHeight: 1.35,
            }}>
              <MapPin size={14} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />{r.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, position: "relative", isolation: "isolate", zIndex: 0 }}>
        <div data-noswipe><LeafletMap pin={pin} onPick={pickPoint} /></div>
        <button onClick={useMyLocation} disabled={locating} className="glass press" style={{
          position: "absolute", right: 10, bottom: 26, zIndex: 500, border: "none", padding: "8px 12px", borderRadius: 999,
          display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 12, fontWeight: 600,
        }}>
          {locating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <LocateFixed size={14} />} Use my location
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: error ? T.accent : T.textDim, marginTop: 6, lineHeight: 1.4 }}>
        {error || (pin ? "Pinned. Tap the map to move the pin." : "Search, or tap the map to drop a pin.")}
      </div>
    </div>
  );
}
