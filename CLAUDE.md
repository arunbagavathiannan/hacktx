# HackTX '26 — "Take the plans out of the GC"

## What we're building

An Android app that notices when your WhatsApp group chats and Instagram DMs turn into plans
("we should go to Austin next month") and pops up asking if you want it planned. Tapping
yes opens the app's planning screens, which walk the group through the plan — map, places,
hotels, flights — with real results. Think [Boba](https://boba.app/), but it lives on your
phone and reads the chats you already use instead of joining them as a bot.

It reads chats **from the phone's notifications**, not through Meta's APIs (those don't
expose personal chats). Muse Spark decides whether a message is a plan.

Tracks: **Meta** (Muse Spark) and **SerpAPI** (search results).

## Priorities — in this order

1. **The demo path works end to end and never breaks on stage.**
2. **It looks great.** Visual polish beats feature count every time.
3. **Pitch material** (Devpost write-up, slide deck) is real work, not an afterthought.

Anything not on the demo path is mocked or skipped. When in doubt, ask
"will a judge see this in the 3-minute demo?" If not, don't build it.

## The demo path (the one flow that must be real)

Demo runs on an **Android phone** (dev build, not Expo Go).

1. A teammate sends a trip message to a real WhatsApp group or Instagram DM.
2. Our Android notification listener reads the message from the notification
   (app, chat name, sender, text) and sends recent messages from that chat to Muse Spark.
3. Muse Spark detects planning intent and extracts who / where / when / budget.
4. A heads-up notification pops up: "Planning Austin with Sam? Plan it."
5. Tapping it deep-links into the planning screens with the trip pre-filled.
6. Planning screens show a Google Map plus **real** options from SerpAPI (hotels, flights)
   and Google Places (restaurants, activities).
7. The group votes on options; "Book" shows a confirmation screen.

Privacy (judges will ask): only messages from apps the user turns on are read, filtering
happens on the phone, and only chats that look like plans are sent to Muse Spark.

## Real vs. mocked

| Real | Mocked |
|---|---|
| Reading WhatsApp / Instagram messages from Android notifications | Actual booking and payment (confirmation screen only) |
| Muse Spark detecting plans and extracting trip details | Login, accounts, friends list (hardcoded demo group) |
| Heads-up notification popup and deep link | Other group members' votes (seeded), unless realtime voting is reached |
| Google Maps, SerpAPI hotels/flights, Google Places results | Daily brief, gamification, preferences (unless they're stretch goals we reached) |

Known limits of notification reading (say so if asked): it only sees incoming messages that
show a notification. It misses your own messages and chats that are open on screen.

Rules for mocks:
- Put mock data in `src/mocks/` and mark mock code with a `// MOCK:` comment.
- Mocks must look real on screen. No "lorem ipsum", no placeholder images.
- In the pitch, say plainly what's simulated. Don't claim it uses Meta's messaging APIs; it reads notifications.

## Stack

pnpm monorepo:

| Path | What | Tech |
|---|---|---|
| `apps/mobile` | The app (the demo) | Expo + React Native, Expo Router, NativeWind (Tailwind), Reanimated, Phosphor icons, react-native-maps (Google Maps), expo-notifications |
| `apps/mobile/modules/` | Android native code | Local Expo module (Kotlin) wrapping a `NotificationListenerService` |
| `apps/web` | Landing / pitch site | Next.js, Tailwind, motion.dev, anime.js, three.js, Phosphor icons |
| `supabase/` | Backend | Supabase (Postgres, Realtime for votes, Edge Functions for API calls) |

- **Tooling:** Node 24 LTS, pnpm 10, TypeScript (type-check with `tsgo`), Biome for lint + format.
- **AI:** Muse Spark via the Meta Model API (OpenAI-compatible). Confirm the exact model ID
  in Meta's developer docs before hardcoding it.
- **Search:** SerpAPI (Google Hotels, Google Flights), Google Places API.
- **API keys never go in the app bundle.** Muse Spark, SerpAPI, and Places are called from
  Supabase Edge Functions; keys live in Supabase secrets. The app holds only the Supabase anon key
  and a Google Maps SDK key restricted to the app's Android package name.
- **Android only for now.** The notification listener needs a dev build (`npx expo run:android`
  or an EAS dev build); Expo Go can't load it. Guard native-only code so the planning screens
  still render in the Expo web build (used for PR screenshots).
- **Hosting:** `apps/web` on Vercel. The app is demoed on an Android phone, mirrored to the
  projector (e.g. scrcpy).
- **CI** (every PR, like UTRP): `pnpm check` (Biome) and `pnpm check-types` (tsgo) must pass.

Web-only libraries (motion.dev, anime.js, three.js) stay in `apps/web`. They don't run in React Native;
in the app, use Reanimated.

## Visual standards

- Every screen on the demo path should look finished: real spacing, consistent type, smooth
  transitions, loading states that look intentional (skeletons, not spinners on blank screens).
- Avoid generic AI-looking UI: no default Inter-everywhere, no purple-blue gradients, no cards inside cards.
- Phosphor is the only icon set. Pick one weight (e.g. regular + fill for active states) and stick to it.
- The popup → app handoff is the "wow" moment. Animate it.
- Check the demo on the actual Android demo phone, mirrored the way it will be projected.

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

1. **Accessibility screen reading** (Android): an `AccessibilityService` that reads the open
   WhatsApp/Instagram chat (including your own messages) and shows an overlay popup on top of it.
   Google Play restricts this for non-accessibility apps and Android 17 may block it, so it's
   sideload-only and must not be needed for the demo.
2. Realtime voting across everyone's phones (Supabase Realtime) instead of seeded votes.
3. Preferences screen: checkboxes for what you like, fed into the plan.
4. Daily brief: reminders of things friends mentioned in past chats.
5. Gamification.

## Roadmap (pitch only, don't build)

- **iOS:** iOS doesn't let apps read other apps' notifications or screens. The only route is a
  Shortcuts automation on incoming iMessage/SMS that forwards the text to us. It doesn't cover
  WhatsApp or Instagram.
- Messenger and other chat apps via the same notification listener.

## Working rules for Claude

- Keep changes small and focused on the current task. No refactors nobody asked for.
- Don't add a dependency unless it clearly saves time on the demo path.
- No tests except for whatever protects the demo path from breaking.
- Don't edit `CLAUDE.md`, `.claude/`, `.mcp.json`, or `.github/`. Those changes go through Arun or Villy.
