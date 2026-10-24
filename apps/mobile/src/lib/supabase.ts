import { createClient } from "@supabase/supabase-js";

// Supabase client for the app. Holds only the anon key (see CLAUDE.md: API keys never go in
// the app bundle). Copy apps/mobile/.env.example to apps/mobile/.env and fill in the values.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy apps/mobile/.env.example to apps/mobile/.env and restart Expo.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // MOCK: login is mocked for the demo, so there is no session to store or refresh.
  auth: { persistSession: false, autoRefreshToken: false },
});
