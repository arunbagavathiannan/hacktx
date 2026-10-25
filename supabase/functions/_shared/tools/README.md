# Agent tools

One file per tool, each exporting a typed definition (name, description, JSON schema for
arguments), a `describe` line for the timeline, and a handler. `index.ts` exports:

- `toolDefinitions`: the OpenAI-compatible `tools` param to send to Muse Spark.
- `runTool(name, argsJson, ctx)`: runs one tool call. It never throws: bad args, errors and
  timeouts (8 s) come back as `ok: false` with a message for the model and the timeline.
  `input` and `summary` map to `agent_steps.input_summary` / `result_summary`.

| Tool | Does | Mock? |
|---|---|---|
| `extract_trip` | Who / where / when / budget from **any** chat (one Muse Spark call) → `plans.trip`; gaps go in `missing` so the agent asks | demo trip only when there is no Muse Spark key |
| `search_flights` | SerpAPI `google_flights` | live with `SERPAPI_API_KEY`; else fixture (AUS → DEN) |
| `search_hotels` | SerpAPI `google_hotels` | live with `SERPAPI_API_KEY`; else fixture (Denver) |
| `search_places` | SerpAPI `google_maps` (restaurants / activities) | live with `SERPAPI_API_KEY`; else fixture (Denver) |
| `pin_on_map` | Saves chosen results to `plan_options` (map pins + vote options) | real |
| `create_poll` | Opens a vote on a category's pinned options | seeds other members' votes (MOCK) |
| `tally_votes` | Counts votes, marks the winner, sets the plan `ready` | real |
| `ask_user` | Sets `pending_question`, plan `needs_input` | real |
| `book` | Live SerpAPI booking options (Google Flights sellers, Google Hotels site prices) with links, cheapest first; total + confirmation code; refuses unless the user tapped Book | MOCK: confirmation code only; no payment (links out to book) |

Search results get a `ref` (`hotel_2`). The model uses refs for every later call.

Searches go through `../serpapi.ts`. If a live call fails, the tool falls back to the fixture in
`../mocks/` (same response shape) when one exists, so the demo never shows an empty screen;
`details.source` says which one was used. Keys (Muse Spark, SerpAPI) come from Supabase secrets
via `Deno.env.get(...)`, never from the app.

Tools read and write through `PlanStore` (`store.ts`): `supabaseStore(client)` in the Edge
Function, `memoryStore(plan)` in tests.

```sh
deno test --allow-env supabase/functions/_shared/tools/
```

## API-call guards

No failure turns into a loop of paid calls:

- **Per run** (`agent/loop.ts`): at most 10 tool calls and 14 Muse Spark calls; an identical
  repeat of a read-only call (`extract_trip`, `search_*`) is answered from cache; a tool that
  fails twice is skipped for the rest of the run. Live calls are never retried.
- **SerpAPI** (`../serpapi.ts`): after a failure, live calls pause for 60 s (10 min after
  401 / 403 / 429) and searches use the fixture or fail politely. "No results" doesn't count.
- **detect**: chats with nothing trip-like skip Muse Spark; the same batch within 10 minutes
  reuses the earlier answer.
- **agent**: a second run of a plan that's already running gets `409`; booking a plan that's
  already booked returns the same confirmation with no new lookups.

## Preferences

The app sends the owner's onboarding answers as `preferences` (same shape as the app's
`Preferences`) when it starts a run. `../preferences.ts` cleans them up, and then:

- **Planner:** gets them in its first message ("My preferences: …"). Food is a hard rule.
- **search_hotels:** the budget tier caps the nightly price (`$` ≈ $200, `$$` ≈ $350, `$$$` none)
  unless the model sets its own cap.
- **search_flights:** "Short flight (<3h)" means nonstop unless the model says otherwise.
- **search_places:** dietary needs are added to restaurant searches ("… Vegetarian friendly").
- **Verifier:** code checks the chosen hotel against the budget tier and flags flights with
  stops for "Short flight"; the model pass checks restaurants against food restrictions.
