// Where the app's shared data lives.
// "supabase" (the real online backend) is the default. Tests on a computer can
// build with VITE_BACKEND=local to keep everything on the device instead.
export const SUPABASE_URL = "https://lmazwrzlruizrepgsmxc.supabase.co";
// The publishable key is meant to be inside the app: it can only do what the
// database's security rules allow for the signed-in person.
export const SUPABASE_KEY = "sb_publishable_z_D-pnJ-8VwOR0algdFVOg_nupbJVec";

export const REMOTE = (import.meta.env?.VITE_BACKEND || "supabase") !== "local";

// How often to check for new posts, likes, notifications… while the app is open.
export const REFRESH_MS = 20000;
