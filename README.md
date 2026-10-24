# Huddle

Take the plans out of the GC. HackTX '26.

| Path | What |
|---|---|
| `apps/mobile` | Android app (Expo) |
| `apps/web` | Landing page (Next.js) |
| `supabase/` | Backend: database + Edge Functions (detector, agent, tools) |

## Setup

Needs Node 24 and pnpm 10.

```bash
pnpm install
pnpm mobile         # Expo dev server
pnpm web            # landing page on localhost:3000
pnpm check          # Biome lint + format
pnpm check-types    # TypeScript
```

See [CLAUDE.md](CLAUDE.md) for the design and [NEXT_STEPS.md](NEXT_STEPS.md) for what's after the MVP.
