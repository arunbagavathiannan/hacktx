# Contributing to Huddle

The fastest way to build is to have **Claude do the work from GitHub**. You write the task,
`@claude` builds it and opens a PR, Claude reviews it, and a human merges. You never need to
install anything.

This follows the way Meta engineers ship with agents (see `docs/meta-agents-workshop.md` and
"How we build with agents" in `CLAUDE.md`).

## Before you start

- You need **write access** to this repo. `@claude` ignores everyone else.
- `@claude` runs on Arun's Claude Max plan. Be specific so one request does the job, instead of
  many small retries.
- Each request runs for at most **30 minutes / 30 turns**, one at a time per issue or PR.

## 1. Pick a track

Tracks touch separate folders, so people can work in parallel without conflicts.

| Track | Folders | Notes |
|---|---|---|
| Planning screens, map, live agent timeline | `apps/mobile/src/` | Mock data until we have API keys |
| Agent + tools + database | `supabase/` | Mock SerpAPI / Muse Spark responses until keys exist |
| Landing page | `apps/web/` | three.js hero, anime.js animations, AstroWind as layout reference |
| Android notification listener | `apps/mobile/modules/` | Needs Android Studio + a phone, so a human does this one |

## 2. Open an issue with goal and guardrails

Create a new issue and paste this, filled in:

```markdown
@claude implement this.

## Goal
<!-- One sentence: what should exist when this is done? -->

## Done when
- [ ] <!-- e.g. the trip summary screen shows flights, hotels, and places from mock data -->
- [ ] `pnpm check` and `pnpm check-types` pass

## Allowed to touch
- <!-- e.g. apps/mobile/src/app/plan/, apps/mobile/src/mocks/ -->

## Do not touch
- <!-- e.g. supabase/, apps/web/ -->

## Notes
<!-- Designs, links, screenshots, anything that helps -->
```

Tips:
- **Keep it small:** one screen, one tool, or one function per issue. Split bigger work into
  several issues.
- **Be concrete about "done":** Claude checks its work against that list.
- Putting `@claude` in the issue starts it immediately. Leave it out if you want to write the
  issue first, then comment `@claude implement this` when ready.

## 3. Claude builds it

Claude reads `CLAUDE.md`, works on a new branch, runs the checks, and replies on the issue with
what it did and a link to open the PR. Open the PR from that link (the PR template fills in the
description).

Claude can't edit `CLAUDE.md`, `.claude/`, `.mcp.json`, or `.github/`. Ask Arun or Villy for
those.

## 4. Claude reviews it

On the PR, comment:

```
@claude review this PR. Check: (1) lint/types, (2) does the code match the PR description,
(3) edge cases: empty data, missing fields, API failure, (4) does it stay inside CLAUDE.md's
scope and the issue's "do not touch" list. Fix anything you find.
```

Use a **regular PR comment**, not an inline review comment (inline review comments don't
trigger Claude).

To ask for changes, comment `@claude` plus what you want, e.g. `@claude make the cards use the
Phosphor regular weight and add a loading skeleton`.

## 5. A human merges

- Check the PR has **screenshots** (UI) or a **diagram** (backend), and the **check output**.
- CI must be green.
- PRs that touch protected files need Arun's or Villy's approval. Everything else can be
  merged by a teammate after checking.
- Claude never merges its own PRs.

## Running it locally (optional)

```bash
pnpm install
pnpm mobile         # Expo dev server
pnpm web            # landing page on localhost:3000
pnpm check          # Biome lint + format
pnpm check-types    # TypeScript
```

Needs Node 24 and pnpm 10.
