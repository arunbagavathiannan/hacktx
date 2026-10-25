Method: design review only (detector not applicable, native platform). Impeccable launcher/scripts not installed, so no `impeccable detect`, no overlay, no critique snapshot. Evidence = source read + Expo **web** export screenshotted in Chromium at 390x844 (`shots/`). Not checked on the Android demo phone, so font rendering, elevation and the real tile layer may differ slightly on device.

# Huddle: "less AI-generated" critique

Reviewed 2026-10-24 against `main` @ 4c7ea73. Paths are relative to `hacktx/apps/mobile/src/` unless noted.

## Verdict

The bones are good. The palette is warm instead of purple, the type pairing is real (Bricolage Grotesque + Manrope), the icon set is a single family (Phosphor), and the copy is mostly in the product's own voice ("im down if it's under like 400"). What makes it look AI-built is **assembly, not taste**: every screen uses the same five parts:

1. a small UPPERCASE tracked label above every group (`Label`, 20+ uses),
2. a 20px-radius `bg-surface border-line` card around every group,
3. a Phosphor icon inside a 36–44px tinted circle at the start of every row,
4. a tinted pill badge for metadata ("From WhatsApp", "Fits budget", "Picked from your onboarding"),
5. a ✦ Sparkle icon for anything "smart" (9 places).

Any one of these is fine on its own. All five on every screen is the default output of a model asked for "a clean dark mobile UI". You could swap this onto a fitness app or a budgeting app and it would still fit.

**The one exception is the share card** (`components/booked/ShareCard.tsx`): sunset sky gradient, ridgeline SVG, ticket perforation with notches, "Denver" at 52px. It has a point of view, and it belongs to *this* product. **Recommendation: use the share card as the design language for the rest of the app.** Today it's buried below the fold on the last screen. The plan should look like a ticket the whole way through: it starts as a draft stub on Summary, gets filled in on Map, and gets torn off and handed to the group on Booked. That's the "specific world" this app is missing, and it builds on the established direction (dark + sunset + Bricolage) instead of replacing it.

### Health score (Nielsen, 0–4)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Timeline is strong; but status is said 4 times on Working (eyebrow, bar, "6 of 6", ready row) |
| 2 | Match system / real world | 3 | Chat + heads-up banner read true; booked "seal" metaphor is generic |
| 3 | User control and freedom | 3 | Not now / Skip / Back everywhere |
| 4 | Consistency and standards | 2 | Three different back buttons (48 borderless `plan/incoming.tsx:123`, 40 bordered `plan/map.tsx:161`, 48 bordered `home/IconButton.tsx:18`); pills mean five different things |
| 5 | Error prevention | 3 | CTAs disabled until answered, but disabled looks broken (see Button) |
| 6 | Recognition over recall | 3 | Trip context repeated on every screen header |
| 7 | Flexibility and efficiency | 2 | Fine for a demo; no shortcuts needed |
| 8 | Aesthetic and minimalist design | 2 | Card/eyebrow/badge/icon-circle on every group; Summary has 7 devices for 5 facts |
| 9 | Error recovery | 3 | Fallback timeline row, share status lines are good |
| 10 | Help and documentation | 2 | "Why we ask" lines on clarifications help; nothing else needed |
| | **Total** | **26/40** | Good. Problems are visual, not structural |

### What's working (keep it)

- **Share card** (`components/booked/ShareCard.tsx`): the best thing in the app. Don't touch its structure.
- **Heads-up banner** (`components/incoming/PlanBanner.tsx`): reads like a real Android notification; spring entrance is right.
- **Timeline as the wow moment** (`components/timeline/StepRow.tsx`): connector lines that draw themselves, skeleton detail lines, fallback row. Real system-status design.
- **Copy honesty**: "Demo booking: nothing was charged", "Prices match sources · $382 each", the clarification reasons.
- **Contrast of primary text** (ink on bg ~17:1, muted on bg 7.2:1) and 48dp targets almost everywhere.

---

## Systemic tells (fix once, fixes every screen)

| Tell | Where | Fix |
|---|---|---|
| **Eyebrow labels**: uppercase, `tracking-widest`, `text-faint`, above every block. The craft-floor bans these outright | `components/ui/Text.tsx:26-32` (`Label`), used at `app/index.tsx:39,46,52`, `app/onboarding.tsx:121`, `app/plan/working.tsx:68`, `app/plan/summary.tsx:159`, `app/plan/booked.tsx:98,123,137`, `components/booked/DayPlan.tsx:82,95,134`, `components/globe/GlobeIntro.tsx:96`, `app/settings.tsx:94,121,136,148`, plus a hand-rolled one in `components/map/FlightsRow.tsx:34` | Restyle `Label` into a quiet sentence-case section heading: `font-body-semibold text-sm text-muted`, no uppercase, no tracking. Then **delete** the ones that sit directly above a Title (onboarding "1 of 4", booked "Booked", working status, GlobeIntro "Huddle found 15 options"): the heading should stand on its own |
| **Icon-in-a-circle row leaders** | `components/summary/TripFacts.tsx:24`, `components/settings/SettingRow.tsx:25`, `components/home/PastPlans.tsx:28`, `components/booked/DayPlan.tsx:24`, `components/route/DriveCard.tsx:36`, `components/timeline/StepRow.tsx:99-106`, `components/booked/ShareCard.tsx:155` | Remove the circle. Either drop the icon (TripFacts, Settings, PastPlans) or show it bare at 18px in `muted` (DayPlan, DriveCard). Keep it only where the icon *is* the information (timeline nodes, map pins, share card rows) |
| **Card around every group**, all `rounded-card border-line bg-surface p-4` | `components/ui/Card.tsx:14`, used by TripFacts, ClarificationCard, PastPlans, DayCard, StayCard, BudgetCard, every Settings group | Use spacing and hairline dividers for lists. Save the surface for one thing per screen: the "ticket" (Summary facts, Booked share card) or an interactive selection (ChoiceCard, flight options) |
| **Tinted pill badges as decoration** | `components/ui/Badge.tsx`; `components/home/PlanCard.tsx:39`, `app/plan/summary.tsx:127-130`, `components/summary/ClarificationCard.tsx:50`, `components/booked/DayPlan.tsx:140-143`, `app/plan/booked.tsx:106-111`, `components/map/PlaceSheet.tsx:80-87` | Turn the metadata into plain text in the line it belongs to ("From ski bums on WhatsApp" as the subtitle, "From your onboarding" as muted text next to the answer). Keep Badge only for real status (Fits budget / Over budget), and even that can be colored text |
| **✦ Sparkle = "AI did this"** | `app/index.tsx:59`, `app/plan/incoming.tsx:162`, `components/incoming/PlanBanner.tsx:67`, `components/home/PlanCard.tsx:50`, `app/plan/summary.tsx:133,148`, `components/summary/ClarificationCard.tsx:41`, `components/timeline/StepRow.tsx:160`, `app/settings.tsx:71` | Remove every one. "Plan it" needs no icon (or `ArrowRight`). The `trip.why` line ("Red Rocks show on the 15th") should be a plain subtitle, or quoted from the chat (that's the proof). Ready node: `Check`. Vibe row: no icon |
| **Pill soup**: 48 `rounded-full` vs 7 `rounded-card`. Buttons, chips, badges, toggles, status pills and icon wells are all stadiums | everywhere | Keep stadiums where Android expects them (Material 3 buttons, chips, segmented control, avatars). Remove the rest (badges, icon wells, the map's "3 picks" pill `app/plan/map.tsx:283`, "Today" pill `app/plan/incoming.tsx:143`). Fewer pills, so the ones left mean "tap me" |
| **Bold everywhere**: Manrope 700 in 32 places (button labels, chips, badges, row titles, prices) and 600 in 23. `display-medium` and `body-medium` are loaded and never used | `tailwind.config.js:31-36`, `_layout.tsx:25-32` | 700 only for prices and the primary button. Row titles 600, chips/unselected 500, body 400. Use Bricolage 500 (`display-medium`) for place names and question headings so display type has two weights |
| **No role-based type scale**: 22 arbitrary `text-[Npx]` (8, 9, 10, 11, 13, 14, 15, 17, 30, 52), titles resized ad hoc (`text-4xl leading-[44px]` in 4 files) | `components/map/PlaceCallout.tsx:136-176`, `components/booked/ShareCard.tsx`, etc. | Add role tokens to `tailwind.config.js` (see DESIGN.md: `display-xl / display / title / headline / body / small / caption`) and use them. Give Bricolage negative tracking at display sizes (-0.02em) |
| **No tabular numerals** on any price, count or time | prices in PlanCard, FlightsRow, map footer, DayPlan, ShareCard | `style={{ fontVariant: ["tabular-nums"] }}` (or NativeWind `tabular-nums` if it compiles on native; verify) on every money/count/time Text |
| **`faint` fails contrast**: #6E675F is 3.55:1 on bg, 3.30 on surface, 3.01 on raised. It's used for timestamps, placeholders, "No picks yet", the Working footer | `theme/colors.js:11` | `faint: "#8F877D"` (5.59 / 5.19 / 4.74). Still clearly below `muted` (#A39B91, 7.2) |
| **Disabled primary = muddy brown** (accent at 50% = #854223, label 2.64:1). It looks broken, and it's on screen in the demo on Onboarding and Summary | `components/ui/Button.tsx:49` | Disabled primary: `bg-raised` + `text-muted` label, no opacity. It reads as "not yet", not "broken" |
| **Unicode glyphs as icons** ("● " and "━ " in the legend). A craft-floor ban | `components/route/RouteView.tsx:74,80` | 8px `View` dot / 12x2 bar in the arc color, or Phosphor `Circle` fill |
| **Off-world category hue**: nightlife lavender `#B9A5FF`, and activity pins in success-green | `components/map/categories.ts:13-14` | Night → dusk rose `#F0789A`, Do → dusk teal `#5FC0C8`; keep `good` green for success only |

---

## Per screen

### Home (`app/index.tsx`, `components/home/*`)

Shot: `shots/-demo-home.png`

- **Stock icon as a logo.** `ChatsCircle` fill in accent + "Huddle" Title (`app/index.tsx:31-32`). A Phosphor glyph next to a wordmark is the default "logo" in generated apps. **Fix:** wordmark only, lowercase or as-is, in Bricolage at the display size; drop the glyph. (A real mark can come later; no mark beats a stock one.)
- **Eyebrow + filler copy.** "SPOTTED IN YOUR CHATS" + "Huddle noticed this trip in your group chat. Tap to review it." (`:39-40`). The card already says all of that. **Fix:** delete both.
- **PlanCard is a generic info card**: accent pill "From WhatsApp", caret, title, sparkle line, divider, `UsersThree` status row (`components/home/PlanCard.tsx:37-57`). **Fix:** make it a mini ticket. A 56px sunset-gradient strip with "Denver" in display type, then dates + avatars, then "from ski bums · ~$382 each" in one muted line with tabular numbers. No badge, no sparkle, no footer row.
- **Past plans**: icon wells (`components/home/PastPlans.tsx:28`). **Fix:** plain rows, no icons; price right-aligned with tabular numbers.
- **Demo block is the loudest thing on screen**: a dashed card with an accent eyebrow and a full-width primary button (`app/index.tsx:50-62`). It competes with the plan card. **Fix:** no dashed box, no eyebrow. Use a `secondary` button "Replay the group chat" at the bottom, or a text button. *Tradeoff for Arun:* if the live web demo starts here, it may want to stay primary. If so, make it the only primary on the screen and drop the PlanCard's caret affordance.

### Onboarding (`app/onboarding.tsx`, `components/onboarding/*`)

Shot: `shots/onboarding.png`

- "1 OF 4" eyebrow (`app/onboarding.tsx:121-123`) repeats the segmented progress bar right above it. **Fix:** delete.
- Disabled "Next" is muddy brown (Button fix covers it).
- Chips are fine. ChoiceCard (`components/onboarding/ChoiceCard.tsx`) is a legitimate selectable surface, so it keeps its card. Its `$`/`$$` glyph in a 44px column works.
- The lower half of the screen is empty on step 1. Acceptable for onboarding; don't fill it.

### Incoming chat + heads-up banner (`app/plan/incoming.tsx`, `components/incoming/*`)

Shots: `shots/plan-incoming.png`, `shots/plan-incoming-demo-banner.png`. **This is the first frame of the demo video.**

- Sparkle on "Plan it" (`components/incoming/PlanBanner.tsx:67`) and on the "Huddle spotted a plan · Review" pill (`app/plan/incoming.tsx:162`). **Fix:** remove both. "Plan it" with no icon is stronger.
- Timestamps 11px in `faint` (`components/incoming/ChatBubble.tsx:31`) and the "Today" pill (`app/plan/incoming.tsx:143`) fail contrast. Token fix covers color. **Fix:** "Today" as plain centered caption text, no pill.
- Chat bubbles all use `rounded-card` (20px) with `rounded-bl-md`. Fine. Leave them.
- Banner: keep. Optional: show a 1-line quote of the triggering message under the title ("denver?? red rocks has a show nov 15") instead of "Huddle spotted a trip in ski bums". It's specific, and it proves the detection.

### Working timeline (`app/plan/working.tsx`, `components/timeline/*`)

Shot: `shots/plan-working-demo-done.png`. **Part of the demo's wow moment.**

- **Status said four times**: green check + "PLAN READY" eyebrow (`app/plan/working.tsx:60-73`), the progress bar (`:85`), "6 of 6 steps" (`:86-88`), then the ReadyRow at the bottom. **Fix:** delete the eyebrow row. Keep the bar. Put the avatars on the title row. Turn "6 of 6 steps" into one line under the dates: live dot + "Working · 4 of 6", then "Ready · checked against sources".
- **Nodes are heavy**: 44px filled `accent-soft` circles with accent icons for every step (`components/timeline/StepRow.tsx:99-106`). All rows weigh the same, so the running step doesn't stand out. **Fix:** finished nodes = 32px, `border-line` outline, icon in `muted`. Only the running node gets accent fill + pulse ring. The connector already carries the progress color.
- **ReadyRow**: green circle + Sparkle (`StepRow.tsx:159-160`) adds a third brand color for the climax. **Fix:** accent node with `Check`, so the payoff is sunset-colored.
- The list scrolls under the header with a hard cut (first row clipped in the screenshot). **Fix:** a 24px top fade (LinearGradient bg→transparent), the same way the map does it.
- Footer "Huddle checks every price before you see it" uses `faint` (`:53-54`). Token fix covers it. Good copy, keep it.

### Summary (`app/plan/summary.tsx`, `components/summary/*`)

Shot: `shots/plan-summary.png`. **Demo step 6.**

- **Seven devices for five facts**: accent pill badge (`:127-130`), Title, sparkle + why line (`:133-134`), a TripFacts card with four icon wells (`components/summary/TripFacts.tsx:24,40`), sparkle preference lines (`:145-151`), "ONE QUICK QUESTION" eyebrow (`:159`), a ClarificationCard with an Info icon + Sparkle hint + "Picked from your onboarding" badge (`components/summary/ClarificationCard.tsx:24,36,41,50`).
- **Fix (the ticket stub):**
  - Header: Title "Denver weekend" at `display`, then one muted line "From ski bums on WhatsApp · Red Rocks show on the 15th". No badge, no sparkle.
  - Facts: a single surface (the only card on the screen, 20px radius) laid out as a **2x2 label/value grid**: *Where* Denver, CO / from AUS · *When* Fri Nov 13 – Sun 15 · *Budget* $400 each · *Who* 5 going + AvatarStack. Small muted labels in sentence case, values in `headline`, tabular numbers. No icons.
  - Then a perforation (lift `Perforation` from `ShareCard.tsx:87-99` into `components/ui/Perforation.tsx`), and below it the **stub**: the question "Fly or drive?" in `headline`, the chips, and the reason as muted text. It's the same ticket, so the question doesn't need its own card or eyebrow.
  - Preference lines: plain muted text, no sparkles, or fold them into the stub as "Based on your onboarding: …".
  - "Picked from your onboarding" → muted inline text after the chips ("· from your onboarding"), not a green badge.
- Disabled "Open the map" is muddy brown (Button fix covers it).

### Map, City view (`app/plan/map.tsx`, `components/map/*`, `components/globe/GlobeIntro.tsx`)

Shots: `shots/plan-map-demo-map.png`, `shots/plan-map-demo-callout.png`. **Demo step 7, the "real results" proof.**

- **The basemap reads as a black void.** `SHADE_OPACITY = 0.5` over Esri Dark Gray Canvas (`components/map/tiles/TileLayer.tsx:34`) leaves streets barely visible. The pins look like they float in nothing, which undercuts "real places". **Fix:** 0.25–0.3; check that pins still pop.
- **Attribution pill sits in the chip row, over the pins** (`components/map/tiles/Attribution.tsx:20`: bordered, bg pill). **Fix:** keep it visible (Esri requires that) but as plain 10px text without border/background, tucked against the map's bottom-right edge above the fade. That needs an `ATTRIBUTION_TOP` → bottom anchor change in `MapCanvas.tsx:156`.
- **Rainbow pins**: gold, orange, green, lavender (`components/map/categories.ts:11-14`). Category color is legitimate on a map, but lavender and green are outside the world. **Fix:** see the systemic table (rose + teal).
- **"3 picks · $382/person est." in a pill** (`app/plan/map.tsx:283-287`). **Fix:** plain text, tabular numbers, `headline` weight for the number; the budget status stays as colored text on the right.
- **Uppercase tracked flights header** (`components/map/FlightsRow.tsx:34`): "ONE FLIGHT AUS → DEN". **Fix:** sentence case "One flight, AUS → DEN" in `small` semibold muted.
- **GlobeIntro eyebrow** "Huddle found 15 options" in accent caps above the title (`components/globe/GlobeIntro.tsx:96`). **Fix:** title first ("Denver, Colorado"), then "15 options found · AUS → DEN · Fri Nov 13 – Sun 15" as the subtitle.
- **Back button is 40dp with border** (`app/plan/map.tsx:161`), unlike the 48dp elsewhere. **Fix:** reuse `components/home/IconButton.tsx` (move it to `components/ui/` in the primitives track).
- PlaceCallout is well built (tail, placement logic). Only change: the tinted icon well (`PlaceCallout.tsx:129-134`) → bare icon. Arbitrary 13/17px sizes → `small`/`headline` tokens.
- PlaceSheet: tinted category pill (`PlaceSheet.tsx:80-87`) → colored icon + text, no pill; the bordered info box (`:103`) → hairline-separated rows, no box.

### Map, Route view (`components/route/*`)

Shot: `shots/plan-map-demo-route.png`

- The dotted globe with the orange rim glow is distinctive. Keep it.
- Unicode legend glyphs (`components/route/RouteView.tsx:74,80`). Fix as in the systemic table.
- Leg number in a 20px circle (`RouteView.tsx:95-96`). It's a section number that carries order, so it's acceptable. Could be plain "1" in `faint` tabular.

### Booked + share card (`app/plan/booked.tsx`, `components/booked/*`)

Shots: `shots/plan-booked.png`, `shots/plan-booked-demo-card.png`. **The last frame of the demo video. By the peak-end rule, it matters most.**

- **The confirmation is the most templated screen in the app**: a SealCheck in a tinted circle with confetti (`app/plan/booked.tsx:89-96`), a "BOOKED" eyebrow (`:98`), a centered two-line Title, a centered info pill (`:106-111`), a centered avatar row, then a **hero-metric BudgetCard** (`components/booked/DayPlan.tsx:118-162`: small caps label, big "~$382", green pill badge, progress bar, caption). That's the exact "big number + small label + accent" template.
- **The share card, which is the actual payoff, is ~2 screens down** (`:136-169`).
- **Fix:**
  1. Lead with the share card. Title left-aligned "You're going to Denver" (`display`), date + "5 of you" line, then the **ShareCard at full width** as the hero. Its entrance is the screen's single authored motion: the card rises 24px and fades in, then the perforation stub settles (no spring overshoot). Delete `Confetti` and the SealCheck well.
  2. Directly under the card: "Send to ski bums" primary, "Copy text" secondary, then the status line.
  3. "Demo booking: nothing was charged" → a plain muted footnote under the buttons, with an `Info` icon and no pill. Keep the words; it's honest.
  4. BudgetCard → one line: "~$382 each · $18 under the $400 budget", tabular numbers, `good` text for "under". The meter can stay as a 2px hairline if you want it, but no card, label or badge.
  5. Itinerary ("Your weekend"): day headers as `title`-sized sentence-case text ("Friday, Nov 13"), rows without icon wells, prices tabular and right-aligned, hairline dividers, no DayCard/StayCard surfaces.
- ShareCard: one tweak. The uppercase tracked "SKI BUMS · NOV 13-15" above "Denver" (`ShareCard.tsx:135`) is an eyebrow. Move it under the city as `small` semibold in `bg/70`, sentence case ("ski bums · Nov 13–15"). Everything else stays.

### Settings (`app/settings.tsx`, `components/settings/*`)

Shot: `shots/settings.png`. Off the demo path, so lowest priority.

- Four eyebrows, three cards, icon wells on every row, a Sparkle for "Vibe". **Fix:** sentence-case section headings via the new `Label`, rows without icon wells (label muted small, value body 400), hairline dividers, no cards. The privacy list (green line icons) is good: keep it, but use `muted` icons instead of `good` green so green stays a success color.

---

## Ranked fix plan (top 10)

Ordered by visual impact per minute of work on the demo path (popup → timeline → summary → map → booked/share). Each item owns its files, and no file appears in two items, so builders can run in parallel. **#1 lands first** (≈15 min) because the others use its tokens and `Perforation`/`IconButton`. Everything after #1 can run at the same time.

| # | Fix | Owns these files (only) | Est. | Why here |
|---|---|---|---|---|
| 1 | **Primitives + tokens.** `Label` → sentence-case section heading (no caps/tracking). Button disabled = `bg-raised` + `text-muted`, no opacity; label 600 except primary 700. `Badge` → text-only variant (keep the API). `faint` → `#8F877D`. Add type-role `fontSize` tokens + `display-medium` usage note to tailwind. New `components/ui/Perforation.tsx` (from ShareCard, `notchColor` prop) and move `IconButton` into `components/ui/` (re-export from old path so nothing breaks). | `components/ui/*` (Text, Button, Badge, index, new Perforation, new IconButton), `components/home/IconButton.tsx` (re-export only), `theme/colors.js`, `theme/colors.d.ts`, `tailwind.config.js` | 15 min | One small PR changes every screen: kills 20+ eyebrows, fixes the broken-looking disabled CTA on Onboarding + Summary, fixes all faint-contrast failures |
| 2 | **Booked: the share card is the confirmation.** Lead with title + ShareCard + send buttons; delete Confetti + seal; demo-booking pill → footnote; BudgetCard → one line; itinerary unboxed; ShareCard eyebrow → subtitle. | `app/plan/booked.tsx`, `components/booked/*` (ShareCard, DayPlan, Confetti, Reveal, icons, itinerary, share*) | 40 min | Last frame of the video; currently the most templated screen |
| 3 | **Summary: ticket stub.** No badge/sparkles; 2x2 facts grid in one surface; Perforation; question as the stub; inline "from your onboarding". | `app/plan/summary.tsx`, `components/summary/*` | 35 min | Introduces the ticket language that pays off on Booked |
| 4 | **Working: one status, lighter nodes.** Delete eyebrow row; single status line; finished nodes 32px outline + muted icon; only running node in accent; ReadyRow accent `Check`; top fade on the list. | `app/plan/working.tsx`, `components/timeline/*` | 25 min | The wow moment. Hierarchy makes the *running* step pop |
| 5 | **Map: let the city show.** `SHADE_OPACITY` 0.5 → ~0.28; attribution as plain text at the map's bottom edge; category colors rose/teal; picks pill → plain tabular text; FlightsRow header sentence case; GlobeIntro eyebrow → subtitle; back button → `ui/IconButton`; callout/sheet icon wells + pills removed; RouteView glyph legend → drawn dots. | `app/plan/map.tsx`, `components/map/**` (incl. `tiles/*`, `categories.ts`), `components/route/*`, `components/globe/GlobeIntro.tsx` | 35 min | The "real results" screen looks empty right now; the tile shade is a one-line change |
| 6 | **Popup: drop the sparkles.** "Plan it" without icon; review pill without sparkle; "Today" as plain caption. Optional: quote the triggering message in the banner body. | `app/plan/incoming.tsx`, `components/incoming/*` | 10 min | First frame of the video; tiny diff |
| 7 | **Home: wordmark + mini-ticket PlanCard.** Remove stock-icon logo, eyebrows, filler copy; PlanCard → sunset strip + "Denver" display + one meta line; PastPlans without icon wells; demo block de-emphasized (see tradeoff). | `app/index.tsx`, `components/home/PlanCard.tsx`, `components/home/PastPlans.tsx`, `components/home/pastTrips.ts` | 30 min | Landing frame of the live web demo |
| 8 | **Tabular numerals + weight diet.** No separate files. Each of #2–#7 applies `tabular-nums` to its own prices/counts/times and drops 700 → 600/500 on its own row titles and chips. List it as a checklist item in each of those PRs. | (within #2–#7 scopes) | +5 min each | Prices are the product; jittery proportional digits read as unfinished |
| 9 | **Onboarding: delete "1 of 4".** | `app/onboarding.tsx`, `components/onboarding/*` | 3 min | Demo step 0; trivial |
| 10 | **Settings: unbox.** Rows without icon wells or cards; Sparkle "Vibe" icon removed; privacy icons muted. | `app/settings.tsx`, `components/settings/*` | 20 min | Off the demo path; consistency only |

**Out of scope here:** `apps/web` (landing). I didn't review it. It probably has the same eyebrow/card habits worth a separate pass (Persuade mode, different rules). `app/dev/ui.tsx` should be updated by #1 to show the new primitives, but it's not judged.

### Direction changes I recommend

1. **Adopt the share card as the system's signature ("The Ticket Stub").** Surfaces are rare and meaningful: one ticket per screen. Perforation is the divider motif. Big Bricolage destination names. Sunset gradient only on ticket heads (share card, home PlanCard strip). This extends the current direction; it doesn't replace it.
2. **Green is semantic only.** Today it's a third brand color (ReadyRow, privacy icons, activity pins, Fits budget). Keep it for success/fits-budget text and checks.
3. **Category palette from dusk, not a rainbow**: stay gold, food sunset orange, do dusk teal `#5FC0C8`, night dusk rose `#F0789A`.
4. **Keep pill buttons** (Material 3 on Android expects them). Drop pills everywhere else.
5. **Keep** dark theme, `#FF7A3D` accent, Bricolage + Manrope, and Phosphor regular/fill.

Questions skipped: subagent run; the decisions that need Arun (demo-block prominence on Home, banner quoting the trigger message, adopting "The Ticket Stub") are flagged inline above.
