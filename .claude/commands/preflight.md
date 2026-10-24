---
description: Final check of the app, demo, deck, pitch, and submission before judging
---

Run a pre-judging check and report each item as PASS, FAIL, or NOT CHECKED (with why).
Adapted from currenjin/hackathon-kit (MIT). Don't fix things silently; report first.

**App**
- `pnpm check` and `pnpm check-types` pass.
- Muse Spark, SerpAPI, and Google Places calls authenticate, and there's enough quota for repeated demo runs.
- No API keys in the app bundle, the repo, or on screen.
- The latest build is what we'll demo (Expo Go / web build / Vercel deploy).

**Demo**
- The full demo path works from a fresh reset, twice in a row.
- The exact click/tap path is written down.
- A fallback screenshot or screen recording exists for every live step.

**Deck**
- Every slide rendered and checked: no clipped text, no stretched or low-res screenshots.
- Screenshots match the current UI.
- Numbers and claims match what the demo shows. Mocked features aren't presented as real.
- Sponsor roles match the actual architecture.

**Pitch**
- Script fits the time limit including loading and screen switches.
- Rehearsed with real screens, twice in a row within time.

**Submission**
- Every Devpost field is filled and within character limits.
- Repo, demo, video, and slides links all open.
- Submitted before the deadline (check the official time and timezone).
