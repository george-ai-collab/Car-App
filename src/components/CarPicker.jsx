// Make / model / year must come from the car list, so nobody can add a made-up car.
// The form keeps its own text boxes; this adds the list lookups, the suggestions under
// the boxes, and "Can't find your car?" (which asks an admin to add it).
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { T } from "../theme";
import { tr } from "../lib/i18n";
import { carMakes, carModels, requestCar } from "../lib/catalog";
import { findMake, findModel } from "../lib/carCatalog";

export const yearOk = (y) => /^\d{4}$/.test(y) && +y >= 1950 && +y <= new Date().getFullYear() + 1;

export function useCarPick(make, model) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  useEffect(() => { let on = true; carMakes().then((m) => on && setMakes(m)); return () => { on = false; }; }, []);
  const canonMake = findMake(makes, make);
  useEffect(() => {
    let on = true;
    if (!canonMake) { setModels([]); return; }
    carModels(canonMake).then((m) => on && setModels(m));
    return () => { on = false; };
  }, [canonMake]);
  const canonModel = canonMake ? findModel(models, model) : null;
  return { makes, models, canonMake, canonModel };
}

// Which box (make / model) is being typed in, for the suggestions.
// Leaving a box waits a moment before hiding them (so a tap on a suggestion still counts);
// focusing a box cancels that wait.
export function useCarField() {
  const [field, setField] = useState(null);
  const timer = useRef(null);
  return {
    field, setField,
    focus: (f) => { clearTimeout(timer.current); setField(f); },
    blur: () => { clearTimeout(timer.current); timer.current = setTimeout(() => setField(null), 150); },
  };
}

// What matches the typed text: starts-with first, then contains. Shows popular ones when empty.
function matches(list, text, max = 8) {
  const q = text.trim().toLowerCase();
  if (!q) return list.slice(0, max);
  const starts = [], has = [];
  for (const x of list) {
    const l = x.toLowerCase();
    if (l === q) continue;
    if (l.startsWith(q)) starts.push(x); else if (l.includes(q)) has.push(x);
    if (starts.length >= max) break;
  }
  return [...starts, ...has].slice(0, max);
}

// field = which box has focus ("make" | "model" | null).
export function CarSuggestions({ field, make, model, pick, onMake, onModel }) {
  const list = field === "make" ? matches(pick.makes, make) : field === "model" && pick.canonMake ? matches(pick.models, model) : [];
  if (!list.length) return null;
  return (
    <div data-testid="car-suggestions" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {list.map((x) => (
        <button key={x} type="button" data-testid="car-option"
          onMouseDown={(e) => e.preventDefault()} // keep the box focused
          onClick={() => (field === "make" ? onMake(x) : onModel(x))}
          className="press" style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${T.lineDark}`, background: T.surface2, color: T.text, fontSize: 12.5, fontWeight: 600 }}>
          {x}
        </button>
      ))}
    </div>
  );
}

// Shown under the boxes: what's wrong, and a way to ask for a missing car.
export function CarCheck({ make, model, year, pick, dark = true, flash }) {
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const typedMake = make.trim(), typedModel = model.trim();
  useEffect(() => { setAsked(false); }, [typedMake, typedModel]); // a new car to ask about
  const problem = useMemo(() => {
    if (typedMake && pick.makes.length && !pick.canonMake) return tr("Pick a make from the list.");
    if (pick.canonMake && typedModel && pick.models.length && !pick.canonModel) return tr("Pick a {0} model from the list.", pick.canonMake);
    if (year && year.length === 4 && !yearOk(year)) return tr("Enter a real year (1950 to {0}).", new Date().getFullYear() + 1);
    return "";
  }, [typedMake, typedModel, year, pick.makes, pick.models, pick.canonMake, pick.canonModel]);
  const missing = (typedMake && pick.makes.length && !pick.canonMake) || (pick.canonMake && typedModel && pick.models.length && !pick.canonModel);
  const ask = async () => {
    if (!typedMake || !typedModel) { flash?.(tr("Type the make and model first.")); return; }
    setBusy(true);
    try { await requestCar({ make: pick.canonMake || typedMake, model: typedModel, year }); setAsked(true); }
    catch { flash?.(tr("Couldn't send that. Try again.")); }
    setBusy(false);
  };
  if (!problem && !asked) return null;
  const dim = dark ? T.textDim : T.inkMuted;
  return (
    <div data-testid="car-check" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45, color: dim }}>
      {problem && <div style={{ color: T.accent, fontWeight: 600 }}>{problem}</div>}
      {asked ? (
        <div data-testid="car-requested" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><Check size={13} color={T.accent2} /> {tr("Thanks! We'll add it to the list soon.")}</div>
      ) : missing ? (
        <button type="button" onClick={ask} disabled={busy} data-testid="car-request" style={{ marginTop: 4, padding: 0, background: "none", border: "none", color: dark ? T.text : T.ink, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, textDecoration: "underline" }}>
          <Plus size={12} /> {tr("Can't find your car? Ask us to add it")}
        </button>
      ) : null}
    </div>
  );
}
