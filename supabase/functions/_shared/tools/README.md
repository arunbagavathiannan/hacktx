# Agent tools

One file per tool, each exporting a typed definition (name, description, JSON schema for
arguments), a `describe` line for the timeline, and a handler. `index.ts` exports:

- `toolDefinitions`: the OpenAI-compatible `tools` param to send to Muse Spark.
- `runTool(name, argsJson, ctx)`: runs one tool call. It never throws: bad args, errors and
  timeouts (8 s) come back as `ok: false` with a message for the model and the timeline.
  `input` and `summary` map to `agent_steps.input_summary` / `result_summary`.

| Tool | Does | Mock? |
|---|---|---|
| `extract_trip` | Who / where / when / budget from the chat → `plans.trip` | MOCK: demo trip (people from real senders) |
| `search_flights` | Google Flights via SerpAPI | MOCK: fixture, AUS → DEN only |
| `search_hotels` | Google Hotels via SerpAPI | MOCK: fixture, Denver only |
| `search_places` | Google Places restaurants / activities | MOCK: fixture, Denver only |
| `pin_on_map` | Saves chosen results to `plan_options` (map pins + vote options) | real |
| `create_poll` | Opens a vote on a category's pinned options | seeds other members' votes (MOCK) |
| `tally_votes` | Counts votes, marks the winner, sets the plan `ready` | real |
| `ask_user` | Sets `pending_question`, plan `needs_input` | real |
| `book` | Confirmation code + total; refuses unless the user tapped Book | MOCK: no real booking |

Search results get a `ref` (`hotel_2`). The model uses refs for every later call.

Fixtures in `../mocks/` use the real API response shapes, so going live means replacing the
fixture read with a `fetch`. Keys (Muse Spark, SerpAPI, Google) come from Supabase secrets
via `Deno.env.get(...)`, never from the app.

Tools read and write through `PlanStore` (`store.ts`): `supabaseStore(client)` in the Edge
Function, `memoryStore(plan)` in tests.

```sh
deno test supabase/functions/_shared/tools/
```
