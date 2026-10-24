# HackTX '26 — "Take the plans out of the GC"

## What we're building

A mobile app that watches your group chats on Meta apps (Instagram, WhatsApp, Messenger).
When friends start planning something ("we should go to Austin next month"), it pops up
and asks if you want it planned. Tapping yes opens our app, which walks the group through
the plan — places, hotels, flights — with real results.

Tracks: **Meta** (Muse Spark, Meta-style chat integration) and **SerpAPI** (search results).

## Priorities — in this order

1. **The demo path works end to end and never breaks on stage.**
2. **It looks great.** Visual polish beats feature count every time.
3. **Pitch material** (Devpost write-up, slide deck) is real work, not an afterthought.

Anything not on the demo path is mocked or skipped. When in doubt, ask
"will a judge see this in the 3-minute demo?" If not, don't build it.

## The demo path (the one flow that must be real)

1. Our own group chat screen (an original design, not a copy of Instagram/WhatsApp UI)
   shows friends talking about a trip.
2. New messages go to Muse Spark, which detects planning intent.
3. A popup asks "Want us to plan this?"
4. Yes → our native planning UI opens with the trip pre-filled from the chat
   (who, where, when, budget hints).
5. The app shows **real** options from SerpAPI (hotels, flights) and Google Places
   (restaurants, activities).
6. The group picks options; "Book" shows a confirmation screen.

## Real vs. mocked

| Real | Mocked |
|---|---|
| Muse Spark reading chat messages and extracting the plan | Access to actual Instagram/WhatsApp/Messenger chats (Meta's messaging APIs only cover business accounts, so the chat is our own, synced with Supabase Realtime) |
| SerpAPI hotel/flight results | Actual booking and payment (confirmation screen only) |
| Google Places results | Login, accounts, friends list (hardcoded demo group) |
| | Daily brief, gamification, preferences (unless they're stretch goals we reached) |

Rules for mocks:
- Put mock data in `src/mocks/` and mark mock code with a `// MOCK:` comment.
- Mocks must look real on screen. No "lorem ipsum", no placeholder images.
- In the pitch, say plainly what's simulated. Don't claim a live Meta chat integration we don't have.

## Stack

pnpm monorepo:

| Path | What | Tech |
|---|---|---|
| `apps/mobile` | The app (the demo) | Expo + React Native, Expo Router, NativeWind (Tailwind), Reanimated, Phosphor icons |
| `apps/web` | Landing / pitch site | Next.js, Tailwind, motion.dev, anime.js, three.js, Phosphor icons |
| `supabase/` | Backend | Supabase (Postgres, Realtime for the group chat, Edge Functions for API calls) |

- **Tooling:** Node 24 LTS, pnpm 10, TypeScript (type-check with `tsgo`), Biome for lint + format.
- **AI:** Muse Spark via the Meta Model API (OpenAI-compatible). Confirm the exact model ID
  in Meta's developer docs before hardcoding it.
- **Search:** SerpAPI (Google Hotels, Google Flights), Google Places API.
- **API keys never go in the app bundle.** Muse Spark, SerpAPI, and Places are called from
  Supabase Edge Functions; keys live in Supabase secrets. The app only holds the Supabase anon key.
- **Hosting:** `apps/web` on Vercel. The app demos through Expo Go or a projected Expo web build.
- **CI** (every PR, like UTRP): `pnpm check` (Biome) and `pnpm check-types` (tsgo) must pass.

Web-only libraries (motion.dev, anime.js, three.js) stay in `apps/web`. They don't run in React Native;
in the app, use Reanimated.

## Visual standards

- Every screen on the demo path should look finished: real spacing, consistent type, smooth
  transitions, loading states that look intentional (skeletons, not spinners on blank screens).
- Avoid generic AI-looking UI: no default Inter-everywhere, no purple-blue gradients, no cards inside cards.
- Phosphor is the only icon set. Pick one weight (e.g. regular + fill for active states) and stick to it.
- The popup → app handoff is the "wow" moment. Animate it.
- Demo on a real phone or a projected Expo web build. Check both before pitching.

## Pitch outputs

- `pitch/devpost.md`: Devpost write-up. Run `/submit`.
- `pitch/script.md`: timed pitch script with demo cues and Q&A. Run `/pitch`.
- `pitch/deck/`: short HTML slide deck built with the `claude-design` skill. Problem (plans die
  in the GC) → solution → live demo → how it works → what's next.
- Screenshots and GIFs of the demo path go in `pitch/media/`.
- Before judging, run `/preflight`.

The `claude-design` skill (`.claude/skills/claude-design/`) is for HTML pitch artifacts only,
not for app or website code.

## Stretch goals (only after the demo path is solid)

1. Preferences screen: checkboxes for what you like, fed into the plan.
2. Daily brief: reminders of things friends mentioned in past chats.
3. Group input and voting on plan options.
4. Gamification.
5. A real Instagram DM webhook using a Creator/Business test account.

## Working rules for Claude

- Keep changes small and focused on the current task. No refactors nobody asked for.
- Don't add a dependency unless it clearly saves time on the demo path.
- No tests except for whatever protects the demo path from breaking.
- Don't edit `CLAUDE.md`, `.claude/`, `.mcp.json`, or `.github/`. Those changes go through Arun or Villy.
