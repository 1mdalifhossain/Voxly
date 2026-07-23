import { createClient } from "@supabase/supabase-js";

// Set these in a .env file at the project root (see .env.example):
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  // Without this, a missing .env silently produces a client that fails on
  // the first network call with a confusing low-level error — this points
  // straight at the fix instead.
  console.error(
    "[Voxly] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in your Supabase project's credentials."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Example usage once you wire up auth/feed pages ---
//
// Auth:
//   await supabase.auth.signUp({ email, password });
//   await supabase.auth.signInWithPassword({ email, password });
//
// Realtime (e.g. live feed):
//   supabase
//     .channel("public:posts")
//     .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
//       // handle new post
//     })
//     .subscribe();
//
// Storage (e.g. media uploads):
//   await supabase.storage.from("post-media").upload(`${userId}/${fileName}`, file);
