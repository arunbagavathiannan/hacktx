# Devpost: Huddle

Draft for the HackTX '26 Devpost page. Every claim below is checked against the code on
`main` (Oct 24). Anything simulated is called simulated. Open `TODO`s are listed at the end.

Gallery images (1200×630) are in `pitch/media/devpost/`:
`devpost-cover.png` (cover) and `devpost-how-it-works.png` (how it works). Raw phone
screenshots from the web build are next to them.

---

## Project title

Huddle

## Tagline

Take the plans out of the GC.

## Inspiration

Every group chat has a graveyard of trips. "We NEED a trip before finals." "Denver??"
"I'm down if it's under 400." Then nothing happens, because someone has to compare flights,
find a place for five, and get everyone to agree.

Bots that join the chat feel like an extra person nobody invited. We wanted something that
lives on your own phone, notices the plan in the chats you already use, and does the
boring half for you.

## What it does

Huddle is an Android app that turns a group-chat plan into a trip.

1. **Notices the plan.** A message like "denver?? red rocks has a show nov 15" lands in a
   WhatsApp group. Huddle shows a popup: "Planning Denver with Sam?"
2. **Plans it with an agent.** Tap "Plan it" and a live timeline shows each step: reading
   the chat, searching flights AUS → DEN, finding a place for 5, finding food and things to
   do, then double-checking prices against the budget.
3. **Asks only what's missing.** The trip summary shows who, where, when and budget, plus at
   most one quick question ("Fly or drive?"). Answers you gave in onboarding fill it in.
4. **Lets the group pick on a map.** A globe zooms to Denver, then a map shows pins for
   stays, food and things to do. Tap a pin to add it. Friends' picks show on the pins. The
   per-person total updates and shows if you're under budget.
5. **Hands back a ticket.** The plan becomes a share card (Denver, the flight, the hotel,
   Red Rocks, ~$382 each) you send back to the group chat.

The agent proposes. People decide. Nothing is booked, sent or paid without a tap.

**What's real and what's simulated in the hackathon build:**

| Works today | Simulated in the demo |
|---|---|
| All app screens: onboarding, popup, agent timeline, summary, globe, map, booked, share card | The group chat: messages play back inside the app. The notification listener isn't built yet. |
| Onboarding answers saved on the phone and used to answer the summary question | The agent timeline in the app: it replays demo steps on a timer |
| Live map tiles from Esri (OpenStreetMap data), real coordinates for every place | Flight, hotel and place results: sample data shaped like SerpAPI and Google Places responses. Prices and ratings are made up. |
| Per-person pricing (rooms for the group size, flight, budget check) | Friends' picks on the map (seeded) |
| Share card captured as an image and opened in the Android share sheet | Booking (confirmation screen only; nothing is charged) |
| Backend agent loop, verifier, detector and 9 tools in Supabase Edge Functions | The model inside that loop: a scripted stand-in replays the tool calls Muse Spark would make, until we have the API key |

## How we built it

- **App:** Expo + React Native with Expo Router, NativeWind, Reanimated and Phosphor icons.
  The globe is three.js through `@react-three/fiber`. The map is our own tile layer on
  Esri's Dark Gray Canvas tiles with custom pins. The share card uses
  `react-native-view-shot` and `expo-sharing`.
- **Agent backend:** Supabase Edge Functions.
  - `detect`: one cheap model call per batch of messages returns
    `{ isPlan, confidence, summary }`. Keyword scoring is the fallback.
  - `agent`: a tool-calling loop (OpenAI-compatible function calling) with 9 typed tools:
    `extract_trip`, `search_flights`, `search_hotels`, `search_places`, `pin_on_map`,
    `create_poll`, `tally_votes`, `ask_user`, and a mock `book`. Max 10 tool calls per run.
  - A **verifier** pass checks the plan before anyone sees it: prices match the tool
    results, dates match the chat, the budget holds. Failures go back to the planner once,
    then become a question to the group.
  - Each tool call is a row in `agent_steps`, so the app can show the timeline live.
- **Data:** Postgres tables for `plans`, `plan_options`, `votes` and `agent_steps`.
- **Landing page:** Next.js, Tailwind, three.js hero globe, anime.js and motion.
- **Design:** one written design system (`DESIGN.md`): dark, warm, one sunset accent,
  Bricolage Grotesque + Manrope, and a ticket shape for the plan.
- **How we worked:** the way Meta engineers described shipping with agents at their
  workshop. Each task got a goal and guardrails. One builder agent per track worked in its
  own branch and opened a PR with screenshots and real check output. Reviewer agents went
  first, then a human merged.

## Challenges we ran into

- **Reading chats without Meta's APIs.** Meta doesn't expose personal chats to outside
  apps. Our design reads chats from Android notifications instead. That only sees incoming
  messages that show a notification, so it misses your own messages and open chats.
- **Trusting an agent with a trip.** A mentor pointed out that people won't hand an agent
  real decisions unless they can see what it did. That's why the timeline shows every step,
  the verifier checks prices against sources, and nothing happens without a tap.
- **Group pricing.** "Under 400" means per person, across flights and enough rooms for five.
  We wrote one pricing function in the app that counts rooms for the group, adds the
  flight, and checks the total against the budget.
- **Maps on a phone and in a web build.** We needed the map in the web build for PR
  screenshots too, so we drew our own tile layer and pins instead of a native-only map view.

## Accomplishments that we're proud of

- The whole demo path, from popup to share card, is built and every screen looks finished.
- The agent is a real tool-calling loop with a verifier and guardrails, not a fixed script
  of steps. Only the model inside it is a stand-in for now.
- A written design system that every screen follows, down to tabular numbers on prices.
- PRs shipped with screenshots, so we could review the UI without running it.

## What we learned

- An agent is a goal, a loop and tools. The hard part is the loop's checks, not the prompt.
- Trust comes from showing work. A visible timeline and a "nothing was charged" line do
  more than a confident summary.
- Mock early, but make the mock match the real API's shape. Swapping in live data then
  touches one function per tool.

## What's next

1. **Wire the live pieces:** the Android notification listener, Muse Spark in the detector
   and agent, live SerpAPI and Google Places calls, and the app reading `agent_steps` live.
2. **Payments the group can trust:** confirm before paying, split the cost, check for
   coupons before checkout, and spending limits per trip.
3. **Stronger privacy:** per-chat on/off, a way for friends to opt out, and plan detection on
   the phone so most messages never leave it.
4. **More places:** iOS (through a Shortcuts automation for iMessage/SMS), Messenger and
   Discord.

## Built with

expo, react-native, expo-router, typescript, nativewind, tailwindcss, reanimated,
three.js, react-three-fiber, phosphor-icons, esri, openstreetmap, supabase, postgresql,
deno, next.js, anime.js, motion, zustand, biome, playwright, meta-muse-spark, serpapi,
google-places

(Muse Spark, SerpAPI and Google Places are the designed integrations. The demo runs on
stand-ins for them; see the table above.)

## Tracks

**Meta: Muse Spark.**
- *Where:* `supabase/functions/_shared/muse.ts` is the client (OpenAI-compatible chat
  completions with tools). The `detect` function uses it to spot plans. The `agent` function
  uses it to pick tools in a loop and to verify the plan.
- *What it does in the product:* decides what to search, in what order, when to ask the
  group, and whether the plan holds up.
- *Without it:* the detector falls back to keyword scoring, and the planner can't plan a
  new trip. It can only replay the demo trip.
- *Still to wire:* the API key, base URL and model ID as Supabase secrets. Until then the
  loop runs on a scripted stand-in that makes the same tool calls.

**SerpAPI.**
- *Where:* `search_flights` (Google Flights) and `search_hotels` (Google Hotels) in
  `supabase/functions/_shared/tools/`.
- *What it does in the product:* real flight options and prices for AUS → DEN, and hotels
  priced for the group size, which feed the map and the per-person total.
- *Without it:* no flights or hotels, so no plan and no budget check.
- *Still to wire:* both tools return saved sample responses in SerpAPI's format today. The
  live call replaces one fixture lookup per tool.

## Links

- **Repo:** https://github.com/arunbagavathiannan/hacktx
- **Demo video:** TODO
- **Slides:** TODO (`pitch/deck/` doesn't exist yet)
- **Landing page:** TODO (`apps/web` is built; no deployed URL yet)
- **Try it:** TODO (APK or web build link, if we publish one)

---

## Open TODOs

- [ ] Record the demo video and add the link.
- [ ] Build the slide deck (`pitch/deck/`) and add the link.
- [ ] Deploy `apps/web` (Vercel) and add the landing page link.
- [ ] Decide whether to share an APK or the Expo web build as a "Try it" link.
- [ ] If any live piece lands before submission (notification listener, Muse Spark key,
      SerpAPI key, app reading `agent_steps`), move it from "Simulated" to "Works today" in
      the table and the Tracks section. Don't move it until it runs on the demo phone.
- [ ] Confirm the Muse Spark model ID and that it supports function calling, then name the
      model in "How we built it".
- [ ] Add team members on Devpost.
- [ ] `pitch/notes.md` says notification reading, the agent, maps and search results are
      real. In the code they aren't yet. Update the notes, or make them true, before the pitch.
- [ ] Upload `devpost-cover.png` as the cover and `devpost-how-it-works.png` to the gallery.
