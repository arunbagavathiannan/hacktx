import type { Preferences } from "@/mocks/types";

export type Option = { label: string; title?: string; description?: string };

// The four onboarding questions, in order. Copy lives here so the screen stays small.
export const steps = [
  {
    key: "vibes",
    title: "What's your vibe?",
    subtitle: "Pick as many as you like. Huddle leans every plan toward these.",
  },
  {
    key: "budget",
    title: "How do you like to spend?",
    subtitle: "Per person, for a weekend away.",
  },
  {
    key: "food",
    title: "Anything you don't eat?",
    subtitle: "Huddle only suggests places that work for you.",
  },
  {
    key: "maxTravel",
    title: "How far will you go?",
    subtitle: "For a weekend trip. You can always say yes to more.",
  },
] as const satisfies ReadonlyArray<{ key: keyof Preferences; title: string; subtitle: string }>;

export const vibeOptions: Option[] = [
  { label: "Chill" },
  { label: "Adventurous" },
  { label: "Foodie" },
  { label: "Nightlife" },
  { label: "Outdoorsy" },
  { label: "Culture" },
  { label: "Live music" },
];

export const budgetOptions: Array<Option & { label: NonNullable<Preferences["budget"]> }> = [
  { label: "$", title: "Keep it cheap", description: "Hostels, street food, free things to do." },
  { label: "$$", title: "Comfortable", description: "A nice hotel and a couple of good dinners." },
  { label: "$$$", title: "Treat yourself", description: "The good hotel and the splurge dinner." },
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

export const travelOptions: Option[] = [
  { label: "Driving distance", description: "Road trips, up to about five hours." },
  { label: "Short flight (<3h)", description: "Nonstop and there by lunch." },
  { label: "Anywhere", description: "If the trip is good, distance doesn't matter." },
];

// Multi-select toggle. "No restrictions" can't be combined with a restriction.
export function toggle(list: string[], value: string, exclusive?: string): string[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (value === exclusive) return [value];
  return [...list.filter((v) => v !== exclusive), value];
}
