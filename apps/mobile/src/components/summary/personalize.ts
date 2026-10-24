import { NO_RESTRICTIONS } from "@/components/onboarding/options";
import type { Clarification, Flight, Preferences } from "@/mocks/types";

const SHORT_FLIGHT_MAX_MINUTES = 180; // "Short flight (<3h)" in onboarding

// What we know about this trip that onboarding answers can be checked against.
export type TripContext = { fastestFlightMinutes: number | null };

// "2h 15m" -> 135. Null if the label doesn't parse.
function durationMinutes(label: string): number | null {
  const m = label.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

export function tripContext(flights: Flight[]): TripContext {
  const minutes = flights.map((f) => durationMinutes(f.duration)).filter((n) => n !== null);
  return { fastestFlightMinutes: minutes.length > 0 ? Math.min(...minutes) : null };
}

function isTravelMode(c: Clarification) {
  return c.options.includes("Fly") && c.options.includes("Drive");
}

// Answer a clarification from onboarding, but only when the preference fits this trip.
// Returns null when it doesn't settle the question.
export function inferAnswer(
  c: Clarification,
  prefs: Preferences,
  trip: TripContext,
): string | null {
  if (!isTravelMode(c)) return null;
  const flightFits =
    trip.fastestFlightMinutes !== null && trip.fastestFlightMinutes < SHORT_FLIGHT_MAX_MINUTES;
  if (prefs.maxTravel === "Short flight (<3h)" && flightFits) return "Fly";
  // "Driving distance" never auto-answers: the agent only asks fly-or-drive when the drive
  // is long, so picking "Drive" for the user would contradict their own limit.
  return null;
}

// A muted note when onboarding is relevant but doesn't answer the question.
export function preferenceHint(c: Clarification, prefs: Preferences): string | null {
  if (isTravelMode(c) && prefs.maxTravel === "Driving distance") {
    return "Your onboarding says driving distance (about five hours), so Huddle didn't pick for you.";
  }
  return null;
}

// Lines under the trip facts, e.g. "Using your vibe: Foodie, Live music".
export function preferenceLines(prefs: Preferences): string[] {
  const lines: string[] = [];
  if (prefs.vibes.length > 0) lines.push(`Using your vibe: ${prefs.vibes.join(", ")}`);
  const restrictions = prefs.food.filter((f) => f !== NO_RESTRICTIONS);
  if (restrictions.length > 0) lines.push(`Only food that works for: ${restrictions.join(", ")}`);
  return lines;
}

// MOCK: sample onboarding answers for `/plan/summary?demo=prefs` (PR screenshots, demo rehearsal).
export const demoPrefs: Preferences = {
  vibes: ["Foodie", "Live music"],
  budget: "$$",
  food: ["Vegetarian"],
  maxTravel: "Short flight (<3h)",
};
