# Mocks

Mock data for anything not real in the demo (see CLAUDE.md). Mark mock code with `// MOCK:`.

- `types.ts`: shapes shared with the real agent output later. Keep them in sync with the
  tools in `supabase/functions/_shared/tools/`.
- `trip.ts`: the demo trip (Denver, Nov 13–15, five friends): chat, agent steps,
  clarifications, flights, hotels, and places with real coordinates.
