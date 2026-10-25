// The phone owner's onboarding answers (apps/mobile/src/store/preferences.ts), sent by the
// app with each agent run. Huddle leans the plan toward them: the planner reads them, the
// searches default to them, and the verifier checks the plan against them.

// Same shape as the app's Preferences (apps/mobile/src/mocks/types.ts).
export interface Preferences {
  vibes: string[];
  budget: "$" | "$$" | "$$$" | null;
  food: string[];
  maxTravel: string | null;
}

export const NO_RESTRICTIONS = "No restrictions";
export const SHORT_FLIGHT = "Short flight (<3h)";
export const DRIVING = "Driving distance";

// Per room per night (two to a room). "$" in onboarding is "keep it cheap", "$$" is "a nice
// hotel"; "$$$" has no cap.
const NIGHTLY_CAP_USD: Record<string, number | undefined> = { $: 200, $$: 350 };

const strings = (v: unknown, max = 10) =>
  Array.isArray(v)
    ? [...new Set(v.filter((s): s is string => typeof s === "string" && s.trim() !== ""))]
        .map((s) => s.trim().slice(0, 40))
        .slice(0, max)
    : [];

// Whatever the app sent → a Preferences we can trust, or undefined when there's nothing useful.
export function toPreferences(raw: unknown): Preferences | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const budget: Preferences["budget"] =
    r.budget === "$" || r.budget === "$$" || r.budget === "$$$" ? r.budget : null;
  const maxTravel =
    typeof r.maxTravel === "string" && r.maxTravel.trim() ? r.maxTravel.trim().slice(0, 40) : null;
  const prefs = { vibes: strings(r.vibes), budget, food: strings(r.food), maxTravel };
  const empty = !prefs.vibes.length && !budget && !prefs.food.length && !maxTravel;
  return empty ? undefined : prefs;
}

// Real dietary needs ("No restrictions" isn't one).
export const foodRestrictions = (p?: Preferences) =>
  (p?.food ?? []).filter((f) => f !== NO_RESTRICTIONS);

export const nightlyCapUsd = (p?: Preferences) =>
  p?.budget ? NIGHTLY_CAP_USD[p.budget] : undefined;

export const wantsNonstop = (p?: Preferences) => p?.maxTravel === SHORT_FLIGHT;

// One line per preference, for the planner's and verifier's prompts.
export function describePreferences(p?: Preferences): string {
  if (!p) return "";
  const cap = nightlyCapUsd(p);
  const food = foodRestrictions(p);
  return [
    p.vibes.length && `Vibe: ${p.vibes.join(", ")}. Favour things to do that fit.`,
    p.budget &&
      `Budget: ${p.budget}${cap ? ` (hotels up to about $${cap}/night per room)` : " (no cap)"}.`,
    food.length && `Food: ${food.join(", ")}. Every restaurant must work for this.`,
    p.maxTravel === SHORT_FLIGHT && "Travel: short flights only (nonstop, under 3 hours).",
    p.maxTravel === DRIVING && "Travel: driving distance (about 5 hours). Don't plan flights.",
    p.maxTravel &&
      p.maxTravel !== SHORT_FLIGHT &&
      p.maxTravel !== DRIVING &&
      `Travel: ${p.maxTravel}.`,
  ]
    .filter(Boolean)
    .join("\n");
}
