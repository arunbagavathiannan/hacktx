---
description: Draft the Devpost submission from what actually works in the app
---

Draft the Devpost write-up in `pitch/devpost.md`. Adapted from currenjin/hackathon-kit (MIT).

1. **Collect the facts first.** Read `CLAUDE.md`, the README, and the code on the demo path.
   List what actually works end to end, what is mocked, and which sponsor APIs are really called.
   If something is unclear, ask instead of guessing.
2. **Fill every Devpost field:** project title, tagline (one line), inspiration, what it does,
   how we built it, challenges, accomplishments, what we learned, what's next, built with,
   repo link, demo link, video link, slides link. Mark any field you can't fill as `TODO`.
3. **Sponsor usage.** For Meta (Muse Spark) and SerpAPI, say where it's called, what it does
   in the product, and what breaks without it. Only claim usage that exists in the code.
4. **Be honest about mocks.** Anything simulated (the Meta chat, booking) is described as
   simulated. Never present a mock as a live integration.
5. **Style.** Short sentences, concrete outcomes, no hype words ("revolutionary", "seamless",
   "leverage"). Write for a judge skimming in 60 seconds.
6. **Check links.** Open every link you include. If a link doesn't load, mark it `TODO`.

Output the draft file plus a short list of open `TODO`s. Don't commit or push unless asked.
