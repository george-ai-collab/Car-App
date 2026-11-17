// One-time fill of the car list (car_makes / car_models) and the race tracks.
// Models come from the US government's free vehicle database (NHTSA vPIC, public domain),
// for the makes the app lists, plus the app's own list (sent in the request body).
// It refuses to run again once the list has been filled.
import { createClient } from "npm:@supabase/supabase-js@2";

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/";
const TYPES = ["car", "multipurpose passenger vehicle (mpv)", "truck"];
// vPIC spells a few makes differently.
const VPIC_NAME: Record<string, string> = { "Rolls-Royce": "rolls royce", Mini: "mini", Ram: "ram" };

async function vpicModels(make: string): Promise<string[]> {
  const out = new Set<string>();
  await Promise.all(TYPES.map(async (t) => {
    try {
      const r = await fetch(`${VPIC}${encodeURIComponent(VPIC_NAME[make] || make)}/vehicletype/${encodeURIComponent(t)}?format=json`, { signal: AbortSignal.timeout(20000) });
      const j = await r.json();
      for (const row of j.Results || []) {
        const m = String(row.Model_Name || "").trim();
        if (m && m.length <= 40) out.add(m);
      }
    } catch { /* skip that type */ }
  }));
  return [...out];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "method" });
  const body = await req.json().catch(() => ({}));
  const report: Record<string, unknown> = {};

  if (body.cars) {
    const { count } = await db.from("car_models").select("*", { count: "exact", head: true });
    if ((count || 0) > 0) return reply(409, { error: "already filled" });
    const extra = body.cars as Record<string, string[]>;
    const makes = Object.keys(extra).slice(0, 120);
    const makeRows = makes.map((name, i) => ({ name: name.slice(0, 30), popular: 1000 - i }));
    const { error: e1 } = await db.from("car_makes").upsert(makeRows);
    if (e1) return reply(500, { error: e1.message });
    const counts: Record<string, number | string> = {};
    for (let i = 0; i < makes.length; i += 8) {
      await Promise.all(makes.slice(i, i + 8).map(async (make) => {
        const seen = new Map<string, { make: string; model: string; source: string }>();
        for (const m of (extra[make] || []).slice(0, 200)) {
          const model = String(m).trim().slice(0, 40);
          if (model) seen.set(model.toLowerCase(), { make, model, source: "gulf" });
        }
        for (const model of await vpicModels(make)) {
          if (!seen.has(model.toLowerCase())) seen.set(model.toLowerCase(), { make, model, source: "vpic" });
        }
        const rows = [...seen.values()];
        const { error } = await db.from("car_models").insert(rows);
        counts[make] = error ? error.message : rows.length;
      }));
    }
    report.cars = counts;
  }

  // Fill in vPIC models for makes that came back empty the first time (it can time out).
  if (body.more) {
    const counts: Record<string, number | string> = {};
    for (const make of (body.more as string[]).slice(0, 20)) {
      const { data: known } = await db.from("car_makes").select("name").eq("name", make).maybeSingle();
      if (!known) { counts[make] = "not in the list"; continue; }
      const models = await vpicModels(make);
      const rows = models.map((model) => ({ make, model, source: "vpic" }));
      const { error } = rows.length ? await db.from("car_models").upsert(rows, { onConflict: "make,model", ignoreDuplicates: true }) : { error: null };
      counts[make] = error ? error.message : rows.length;
    }
    report.more = counts;
  }

  if (body.tracks) {
    const { count } = await db.from("tracks").select("*", { count: "exact", head: true });
    if ((count || 0) > 0) return reply(409, { error: "tracks already filled" });
    const { error } = await db.from("tracks").insert(body.tracks);
    report.tracks = error ? error.message : (body.tracks as unknown[]).length;
  }

  // Look up where places are (to check track positions before saving them).
  // OpenStreetMap's Nominatim: one request a second, as its rules ask.
  if (body.geocode) {
    const found: Record<string, unknown> = {};
    for (const q of (body.geocode as string[]).slice(0, 25)) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=2&q=${encodeURIComponent(q)}`, { headers: { "User-Agent": "Carfooly track list setup (one-time)" }, signal: AbortSignal.timeout(8000) });
        const j = await r.json();
        found[q] = j.map((p: any) => [p.name, p.display_name?.split(",").slice(-3).join(",").trim(), +(+p.lat).toFixed(4), +(+p.lon).toFixed(4), p.type]);
      } catch (e) { found[q] = String(e).slice(0, 60); }
      await new Promise((res) => setTimeout(res, 1100));
    }
    report.geocode = found;
  }
  return reply(200, report);
});
