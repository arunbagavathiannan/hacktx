import type { Preferences } from "@/mocks/types";

export type Option = { label: string; title?: string; description?: string };

// The onboarding questions, in order: home city, vibe, food. Copy lives here so the screen stays small. No budget or
// travel-distance question: Huddle asks the group in the chat when it needs to.
export const steps = [
  {
    key: "home",
    title: "Where are you based?",
    subtitle: "Huddle plans trips from here, so flights leave from your city.",
  },
  {
    key: "vibes",
    title: "What's your vibe?",
    subtitle: "Pick as many as you like. Huddle leans every plan toward these.",
  },
  {
    key: "food",
    title: "Anything you don't eat?",
    subtitle: "Huddle only suggests places that work for you.",
  },
] as const satisfies ReadonlyArray<{ key: keyof Preferences; title: string; subtitle: string }>;

// One-tap picks for the home city question; any city can be typed. The airport and map spot
// go to the planner with the city, so flights and the route start from the right place.
export const homeCities: Record<string, { airport: string; lat: number; lng: number }> = {
  Austin: { airport: "AUS", lat: 30.1975, lng: -97.6664 },
  Houston: { airport: "IAH", lat: 29.9902, lng: -95.3368 },
  Dallas: { airport: "DFW", lat: 32.8998, lng: -97.0403 },
  "San Antonio": { airport: "SAT", lat: 29.5337, lng: -98.4698 },
};
export const cityOptions = Object.keys(homeCities);

export const vibeOptions: Option[] = [
  { label: "Chill" },
  { label: "Adventurous" },
  { label: "Foodie" },
  { label: "Nightlife" },
  { label: "Outdoorsy" },
  { label: "Culture" },
  { label: "Live music" },
];

export const NO_RESTRICTIONS = "No restrictions";

export const foodOptions: Option[] = [
  { label: NO_RESTRICTIONS },
  { label: "Vegetarian" },
  { label: "Vegan" },
  { label: "Halal" },
  { label: "Gluten-free" },
  { label: "Nut allergy" },
];

// Multi-select toggle. "No restrictions" can't be combined with a restriction.
export function toggle(list: string[], value: string, exclusive?: string): string[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (value === exclusive) return [value];
  return [...list.filter((v) => v !== exclusive), value];
}
