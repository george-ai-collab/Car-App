// Log in with a handle instead of an email.
// The handle -> email lookup happens here on the server, so nobody can find out someone's
// email from their handle. Wrong passwords are counted per handle: after 5 in 15 minutes,
// that handle is locked for 15 minutes.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const MAX_FAILS = 5;
const WINDOW_MIN = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method" });
  let handle = "", password = "";
  try {
    const body = await req.json();
    handle = String(body.handle || "").trim().replace(/^@/, "").toLowerCase();
    password = String(body.password || "");
  } catch { return reply(400, { error: "invalid" }); }
  if (!/^[a-z0-9_.]{2,24}$/.test(handle) || !password) return reply(400, { error: "invalid" });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await admin.from("login_attempts").select("id", { count: "exact", head: true }).eq("handle", handle).gte("created_at", since);
  if ((count ?? 0) >= MAX_FAILS) return reply(429, { error: "locked" });

  const fail = async () => {
    await admin.from("login_attempts").insert({ handle });
    return reply(400, { error: "invalid" }); // same answer for "no such handle" and "wrong password"
  };
  const { data: prof } = await admin.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!prof) return fail();
  const { data: u } = await admin.auth.admin.getUserById(prof.id);
  const email = u?.user?.email;
  if (!email) return fail();

  const pub = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await pub.auth.signInWithPassword({ email, password });
  if (error || !data.session) return fail();
  await admin.from("login_attempts").delete().eq("handle", handle);
  return reply(200, { access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
