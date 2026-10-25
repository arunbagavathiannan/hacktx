---
name: Huddle
description: Takes the plans out of the group chat. A dark, sunset-lit Android app where every plan ends up as a ticket you hand back to the group.
colors:
  bg: "#0B0A09"
  surface: "#161412"
  raised: "#201D1A"
  line: "#2C2824"
  ink: "#F5F1EC"
  muted: "#A39B91"
  faint: "#8F877D"
  accent: "#FF7A3D"
  accent-soft: "#3A2216"
  gold: "#FFB547"
  good: "#5BD68A"
  bad: "#FF5A5F"
  cat-stay: "#FFB547"
  cat-food: "#FF7A3D"
  cat-do: "#5FC0C8"
  cat-night: "#F0789A"
typography:
  display-xl:
    fontFamily: "BricolageGrotesque_700Bold"
    fontSize: "52px"
    fontWeight: 700
    lineHeight: "56px"
    letterSpacing: "-1px"
  display:
    fontFamily: "BricolageGrotesque_700Bold"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "42px"
    letterSpacing: "-0.7px"
  title:
    fontFamily: "BricolageGrotesque_700Bold"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.3px"
  headline:
    fontFamily: "BricolageGrotesque_500Medium"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: "24px"
  body:
    fontFamily: "Manrope_400Regular"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-strong:
    fontFamily: "Manrope_600SemiBold"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  small:
    fontFamily: "Manrope_400Regular"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Manrope_600SemiBold"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontFamily: "Manrope_500Medium"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  price:
    fontFamily: "Manrope_700Bold"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "24px"
    fontFeature: "tnum"
rounded:
  sm: "8px"
  md: "16px"
  card: "20px"
  ticket: "28px"
  full: "9999px"
spacing:
  hair: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  gutter: "20px"
  lg: "24px"
  section: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    typography: "{typography.price}"
    rounded: "{rounded.full}"
    height: "56px"
    padding: "0 24px"
  button-primary-disabled:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "56px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  chip-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
  ticket:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket}"
    padding: "20px 24px"
  choice-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  choice-card-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  flight-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    width: "228px"
  heads-up-banner:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket}"
    padding: "16px"
---

<!-- Written from a design review on 2026-10-24 (notes/design-review/CRITIQUE.md). Tokens marked "(refined)" below differ from the code at main@4c7ea73; everything else is extracted from it. To make it the repo's source of truth, copy to hacktx/DESIGN.md after Arun/Villy approve. The North Star is proposed, not yet confirmed. -->

# Design System: Huddle

> **Approved direction: "The Ticket Stub"** (Arun, 2026-10-24). One ticket card per screen, perforation dividers, sunset gradient only on ticket tops, green only for success, teal (`cat-do`) and rose (`cat-night`) map pins. "Simulate a plan" stays the main Home button for the live demo. The heads-up popup quotes the chat message that triggered it.

> Source of truth for every UI change. Builders read this plus `notes/design-review/CRITIQUE.md` (per-screen fixes). Generated from an Impeccable review of the web build.

## Overview

**Creative North Star: "The Ticket Stub"** *(proposed)*

Huddle turns a messy group chat into something you can hand back to the group. The visual system follows that arc. The app is a dark room at dusk: near-black warm surfaces, cream text, one sunset orange. The plan itself is the one bright object in the room, and it's shaped like a ticket. It starts as a draft stub on Summary (facts above a perforation, the open question below it), gets filled in on the Map, and gets torn off and sent on Booked as the share card. A sunset gradient and a big Bricolage destination name appear only on ticket heads. Everywhere else, hierarchy comes from type, spacing and hairlines, not from boxes, badges or icon wells.

This is an Operate-mode app on Android: Material 3 structure (stadium buttons, chips, segmented control, bottom sheet, system Back, 48dp targets) carries the interaction. The brand lives in precise details: the palette, the display face, the ticket, and one authored motion per screen.

Confirmed rejections (from CLAUDE.md): Inter-everywhere, purple-blue gradients, cards inside cards, mixed icon sets, spinners on blank screens.

**Key Characteristics:**
- Warm near-black canvas with tonal elevation (bg → surface → raised), no drop shadows except floating overlays.
- One accent (sunset orange) for action and progress; gold for the origin/hotel; green only means success.
- Bricolage Grotesque for anything you'd say out loud (destination, trip name, question); Manrope for everything you read.
- One "ticket" surface per screen; lists are unboxed with hairline dividers.
- Phosphor icons, regular weight, fill only for active/selected; icons are bare, never in tinted circles.

## Colors

Warm-dark neutrals with one sunset accent and a small dusk palette for map categories.

### Primary
- **Sunset Orange** (`accent`): primary buttons, live/running state, progress fills, selected chips (on `accent-soft`), focus. Text on it is `bg` (7.6:1).
- **Ember Well** (`accent-soft`): selected-chip and selected-choice fill; the ridge in the share card. Never a container for icons.

### Secondary
- **Late Gold** (`gold`): origin point on the globe, the stay/hotel category, star ratings, the top of the sunset gradient. Warnings (fallback rows) also use it.

### Tertiary (map categories only)
- **Dusk Teal** (`cat-do`) *(refined, was green)*: things to do.
- **Dusk Rose** (`cat-night`) *(refined, was lavender #B9A5FF)*: nightlife.
- Stay = `gold`, Food = `accent`. Category color appears on pins, the pin's icon and the filter-chip icon only.

### Neutral
- **Night** (`bg`): canvas, status bar, share-card frame.
- **Charcoal** (`surface`): the ticket, choice cards, chat bubbles, unselected chips, bottom sheet.
- **Raised Charcoal** (`raised`): heads-up banner, secondary buttons, disabled primary, skeletons, progress tracks.
- **Hairline** (`line`): 1px dividers and borders.
- **Cream** (`ink`): primary text (17:1 on bg).
- **Stone** (`muted`): secondary text, labels, inactive icons (7.2:1 on bg).
- **Dim Stone** (`faint`) *(refined, was #6E675F at 3.0–3.5:1)*: timestamps, placeholders, tertiary metadata. Now ≥4.7:1 on every surface.
- **Status:** `good` = success/check/under budget; `bad` = over budget/errors.

### Named Rules
**The One Sunset Rule.** The gradient (`gold → accent → accent-soft`) appears only on ticket heads: the share card and the Home plan strip. Never on buttons, text or backgrounds.

**The Green Means Done Rule.** `good` is reserved for success: step checks, "under budget", "added". It's never a decorative or category color.

## Typography

**Display Font:** Bricolage Grotesque (700 Bold, 500 Medium)
**Body Font:** Manrope (400, 500, 600, 700)

**Character:** Bricolage is a little wonky and warm, the voice of the group ("Denver", "Fly or drive?"). Manrope is calm and legible for everything else. The pair works because Bricolage stays rare.

### Hierarchy
- **Display XL** (700, 52/56, -1px): destination name on the share card and Booked hero.
- **Display** (700, 36/42, -0.7px): one per screen: trip title on Summary, onboarding question, Booked title, globe intro city.
- **Title** (700, 24/30): screen headers (Settings, chat name), day headers on Booked, Home wordmark.
- **Headline** (Bricolage 500, 18/24) *(refined: 500 was loaded but unused)*: place names, clarification questions, fact values on the ticket.
- **Body** (Manrope 400, 16/24): chat messages, descriptions. Body-strong (600) for list-row titles.
- **Small** (400, 14/20): secondary lines, reasons, metadata.
- **Label** (600, 14/20, sentence case) *(refined, was 12px 700 uppercase tracking-widest)*: section headings and fact labels.
- **Caption** (500, 12/16): timestamps, attribution, counts under avatars. Floor is 12px. No 8–11px text outside the pin face dots.
- **Price** (Manrope 700, tabular numerals): every amount, count and time.

### Named Rules
**The No Eyebrow Rule.** No uppercase tracked label ever sits above a heading. Section labels are sentence-case `label`, and they sit above groups, not titles.

**The Tabular Money Rule.** Every price, count and time uses tabular numerals (`fontVariant: ["tabular-nums"]`), so totals don't jitter when picks change.

**The Weight Budget Rule.** 700 is for display type, prices and the primary button label. Row titles are 600, chips 500–600, body 400.

## Layout

A single-column phone layout with a 20px gutter (`gutter`), edge-to-edge under the status bar via safe-area insets, and a sticky footer for the screen's one primary action (`Screen` footer, hairline top border).

Rhythm is 4-based and deliberately uneven:
- **4–8px** inside a group (label → value, title → subtitle).
- **12–16px** between rows and between sibling controls.
- **32px** between sections (refined: today every gap is 20–24px, so nothing separates).
- More space above a section label than below it.

Screens lead with their one Display line, left-aligned (refined: Booked is currently centered). Centered type is reserved for empty states.

The Map is the exception: full-bleed canvas between header and footer, with overlays (filter chips top, flights row bottom) sitting on 72–150px gradient fades from `bg`.

## Elevation & Depth

Depth comes from tonal steps (bg → surface → raised), not shadows. Shadows are used only on things that float above other content: the heads-up banner (`0 12px 24px` at 50% black), the map callout (`0 12px 32px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.4)`), and map pins (`0 3px 6px` at 50%). Nothing at rest in the page flow casts a shadow.

### Named Rules
**The Flat Page Rule.** If it scrolls with the page, it's flat. Only overlays cast shadows.

## Shapes

- **Full / stadium:** buttons, chips, segmented control, avatars, pins. Android Material 3 expects stadium buttons, so they stay.
- **28px (`ticket`):** the share card, the heads-up banner, bottom sheet top corners.
- **20px (`card`):** the Summary ticket, choice cards, chat bubbles (with a 6px tail corner), map callout.
- **16px (`md`):** flight options, drive card.
- **8px (`sm`):** attribution, small inline surfaces.

The **perforation** (a dashed hairline with 20px circular notches cut from both edges in the frame color) is the system's signature divider. Use it only inside a ticket, between "what's decided" and "what's left" (Summary) or between the head and the stub (share card).

### Named Rules
**The Pill Means Tap Rule.** A stadium shape signals an interactive control. Status, metadata and icon backgrounds are never pills.

## Components

### Buttons
- **Shape:** stadium (`full`), 56dp tall (48dp inside the banner).
- **Primary:** `accent` fill, `bg` label, Manrope 700 16px. One per screen, in the sticky footer.
- **Disabled primary** *(refined)*: `raised` fill, `muted` label, no opacity. Today it's 50% accent (muddy #854223, 2.6:1), which reads as broken.
- **Secondary:** `raised` fill, 1px `line` border, `ink` label at 600.
- **Ghost:** text only, `muted`.
- **Icons in buttons:** only when the icon adds meaning (arrow for "next", paper plane for send). Never a sparkle.
- **Press:** 80% opacity + light haptic on native.

### Chips
- **Style:** `surface` fill, 1px `line` border, `ink` label 14px 600; optional 14–18px leading icon in `muted`.
- **Selected:** `accent-soft` fill, `accent` border and label, icon switches to fill weight.
- Used for multi-select answers, quick clarifications and map filters.

### The Ticket (signature)
- **Corner style:** 20px in-app, 28px for the share card.
- **Background:** `surface`; the head may carry the sunset gradient (share card, Home strip only).
- **Body:** label/value pairs (`label` muted over `headline` ink), avatars, tabular prices. No icons in wells, no nested cards.
- **Perforation:** separates the head from the stub.
- **One per screen.**

### Lists (itinerary, settings, past plans, trip rows)
- Unboxed. Rows have 12px vertical padding, 1px `line` dividers, title in body-strong, detail in small `muted`, and a right-aligned price in tabular numbers. Leading icons are optional, bare, 18px, `muted`.

### Heads-up banner
- `raised`, 28px radius, floats `insets.top + 8` from the top, springs in from above (damping 16, stiffness 140), slides out up in 220ms. App glyph in a 24px `accent` rounded square, "Huddle · now", title in Display-face 18px, one body line, two 48dp buttons (Not now / Plan it).

### Agent timeline (signature)
- One row per tool call: node, connector, title (body-strong) + detail (small muted).
- **Running node:** 44dp, `accent` border on `surface`, filled icon, expanding pulse ring (1300ms ease-out, loops). Detail is a skeleton line.
- **Finished node** *(refined)*: 32dp, `line` outline, regular icon in `muted`; the connector below fills with `accent` over `LINE_FILL_MS`. A `good` check appears at the row end.
- **Ready node** *(refined)*: `accent` fill with `Check` (not green + Sparkle); single scale pop.

### Map pins and callout
- 40dp circle, category color border; picked = category fill + small `ink` check badge. Friends' picks as 16px face dots hanging under the pin. Drop-in stagger 45ms per pin.
- Callout: `surface`, 20px radius, overlay shadow, rotated-square tail; name (headline), rating (gold star) + price, two-line blurb, Add (accent stadium) / Details (outline stadium).

### Navigation
- Stack navigation with `slide_from_right`. System Back always works (onboarding steps back through questions on Android).
- Header back button: one component, 48dp circular, `surface` + `line` border (refined: Map currently uses a 40dp variant, Incoming a borderless one).

### Motion
- **One authored moment per screen:** popup = banner spring; Working = node pulse + connector draw; Map = globe zoom then pin drop; Booked = the share card rising (refined: replaces seal + confetti).
- Everything else enters with a short fade/rise (≤320ms, ease-out cubic), staggered at most 70ms, from an already-visible layout.
- `useReducedMotion()` collapses every sequence to its final state (already implemented on Incoming, Working, Map, Confetti).

## Do's and Don'ts

### Do:
- **Do** let the trip's own words lead: quote the chat ("denver?? red rocks has a show nov 15") wherever the agent explains itself.
- **Do** use one ticket surface per screen and unboxed lists everywhere else.
- **Do** use tabular numerals for every price, count and time.
- **Do** keep text at or above 4.5:1. That's `faint` (#8F877D) or brighter on any surface.
- **Do** keep icons bare: Phosphor regular, 18–22px, `muted` or category color; fill only for active/selected.
- **Do** say plainly what's simulated ("Demo booking: nothing was charged"), as a footnote, not a badge.

### Don't:
- **Don't** put an uppercase, letter-spaced label above a heading.
- **Don't** put icons in tinted circles as row leaders.
- **Don't** use the Sparkle icon (or any "AI magic" glyph) to mark agent output.
- **Don't** wrap metadata in pill badges; write it into the line it belongs to.
- **Don't** use the sunset gradient anywhere except a ticket head.
- **Don't** use green as decoration or a category color; it means success.
- **Don't** use unicode glyphs (●, ━, ✦) as icons or legend marks.
- **Don't** fade a disabled primary button to half opacity.
- **Don't** use Inter, purple-blue gradients, or cards inside cards (CLAUDE.md).
