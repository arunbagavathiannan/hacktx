import { NO_RESTRICTIONS } from "@/components/onboarding/options";
import type { Clarification, Preferences } from "@/mocks/types";

// Answer a clarification from onboarding when we can, so the user has fewer taps.
// Returns null when preferences don't settle it.
export function inferAnswer(c: Clarification, prefs: Preferences): string | null {
  const isTravelMode = c.options.includes("Fly") && c.options.includes("Drive");
  if (isTravelMode) {
    if (prefs.maxTravel === "Driving distance") return "Drive";
    if (prefs.maxTravel === "Short flight (<3h)") return "Fly";
  }
  return null;
}

// One line under the trip facts, e.g. "Using your vibe: Foodie, Live music".
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
  maxTravel: "Driving distance",
};
