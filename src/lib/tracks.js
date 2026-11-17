// Race tracks, drag strips and karting tracks for "Tracks near you".
// Online the list lives in the tracks table (same rows); this copy is for offline/test builds
// and is what filled the table. Positions were checked against Wikipedia / map listings.
// Starter list (Gulf). Add more rows to the tracks table as you find them.
export const BUILTIN_TRACKS = [
  { id: "bic", name: "Bahrain International Circuit", kind: "circuit", city: "Sakhir", country: "Bahrain", lat: 26.0325, lng: 50.5106, website: "https://www.bahraingp.com", about: "Home of the Bahrain Grand Prix. Track days, drag nights and karting." },
  { id: "yas-marina", name: "Yas Marina Circuit", kind: "circuit", city: "Abu Dhabi", country: "United Arab Emirates", lat: 24.4672, lng: 54.6031, website: "https://www.yasmarinacircuit.com", about: "Abu Dhabi Grand Prix circuit. Open track nights, driving experiences and karting." },
  { id: "yas-drag", name: "Yas Drag Strip", kind: "drag", city: "Abu Dhabi", country: "United Arab Emirates", lat: 24.4714, lng: 54.6090, website: "https://www.yasmarinacircuit.com/en/track-hire/drag-strip", about: "Quarter-mile strip next to Yas Marina Circuit. Drag nights through the season." },
  { id: "dubai-autodrome", name: "Dubai Autodrome", kind: "circuit", city: "Dubai", country: "United Arab Emirates", lat: 25.05, lng: 55.2389, website: "https://www.dubaiautodrome.ae", about: "FIA-graded circuit in Motor City. Track days and race series." },
  { id: "dubai-kartdrome", name: "Dubai Kartdrome", kind: "karting", city: "Dubai", country: "United Arab Emirates", lat: 25.0478, lng: 55.2418, website: "https://www.dubaikartdrome.com", about: "FIA-standard karting track across from the Dubai Autodrome." },
  { id: "lusail", name: "Lusail International Circuit", kind: "circuit", city: "Lusail", country: "Qatar", lat: 25.49, lng: 51.4542, website: "https://www.lcsc.qa", about: "Qatar Grand Prix circuit, with track days and karting." },
  { id: "jeddah-corniche", name: "Jeddah Corniche Circuit", kind: "circuit", city: "Jeddah", country: "Saudi Arabia", lat: 21.6319, lng: 39.1044, website: "", about: "Saudi Arabian Grand Prix street circuit by the Red Sea." },
  { id: "reem", name: "Reem International Circuit", kind: "circuit", city: "Riyadh", country: "Saudi Arabia", lat: 24.3875, lng: 45.9786, website: "", about: "Circuit about 76 km west of Riyadh, off the Hejaz road." },
  { id: "kuwait-motor-town", name: "Kuwait Motor Town", kind: "circuit", city: "Ali Sabah Al Salem", country: "Kuwait", lat: 28.93, lng: 48.1417, website: "", about: "Circuit, drag strip and karting, about 56 km south of Kuwait City." },
];

export const TRACK_KINDS = ["circuit", "drag", "karting", "offroad"];
