# Agent tools

One file per tool, each exporting a typed definition (name, description, JSON schema for
arguments) and a handler. Planned tools: `extract_trip`, `search_flights`, `search_hotels`,
`search_places`, `pin_on_map`, `create_poll`, `tally_votes`, `ask_user`, `book` (mock).

API keys (Muse Spark, SerpAPI, Google) come from Supabase secrets via `Deno.env.get(...)`,
never from the app.
