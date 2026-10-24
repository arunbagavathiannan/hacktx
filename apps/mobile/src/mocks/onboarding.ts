// MOCK: onboarding option lists. Hardcoded for the demo; the ids are what gets saved into
// usePreferences and later handed to the planner agent as the user's defaults.
import type { Icon } from "phosphor-react-native";
import {
  AirplaneTilt,
  Bank,
  Car,
  Coffee,
  ForkKnife,
  GlobeHemisphereWest,
  Martini,
  Mountains,
  Tent,
  Waves,
} from "phosphor-react-native";
import type { Preferences } from "./types";

export type ChoiceOption = { id: string; label: string; icon?: Icon };

export type DetailOption<T extends string> = {
  id: T;
  label: string;
  hint: string; // one-line meaning shown under the label
  icon?: Icon;
};

export const vibeOptions: ChoiceOption[] = [
  { id: "chill", label: "Chill", icon: Coffee },
  { id: "adventurous", label: "Adventurous", icon: Mountains },
  { id: "foodie", label: "Foodie", icon: ForkKnife },
  { id: "nightlife", label: "Nightlife", icon: Martini },
  { id: "outdoorsy", label: "Outdoorsy", icon: Tent },
  { id: "culture", label: "Culture", icon: Bank },
  { id: "beach", label: "Beach", icon: Waves },
];

export const budgetOptions: DetailOption<NonNullable<Preferences["budget"]>>[] = [
  { id: "$", label: "Keep it cheap", hint: "Hostels or split Airbnbs, street food, free stuff." },
  { id: "$$", label: "Comfortable", hint: "A nice place to stay and a couple of good dinners." },
  {
    id: "$$$",
    label: "Treat ourselves",
    hint: "Best spots in town. No splitting the bill by line.",
  },
];

// "none" can't be combined with a restriction; picking one clears the other.
export const NO_RESTRICTIONS = "none";

export const foodOptions: ChoiceOption[] = [
  { id: NO_RESTRICTIONS, label: "No restrictions" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "gluten-free", label: "Gluten-free" },
];

// Separate toggle under the food chips: a taste, not a restriction.
export const LOCAL_SPOTS = "local-spots";

export const travelOptions: DetailOption<string>[] = [
  {
    id: "drive-4h",
    label: "Drive, under 4 hours",
    hint: "Road trip range. Nobody has to go near an airport.",
    icon: Car,
  },
  {
    id: "short-flight",
    label: "Short flight",
    hint: "Up to about 3 hours in the air, nonstop when we can.",
    icon: AirplaneTilt,
  },
  {
    id: "anywhere",
    label: "Anywhere",
    hint: "If the plan is good, distance doesn't matter.",
    icon: GlobeHemisphereWest,
  },
];
