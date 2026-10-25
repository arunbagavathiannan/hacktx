import { Bed, ForkKnife, type Icon, Martini, Ticket } from "phosphor-react-native";
import type { PlaceCategory } from "@/mocks/types";
import { colors } from "@/theme";

export type Filter = "all" | PlaceCategory;

type Meta = { label: string; chip: string; color: string; Icon: Icon };

// Dusk palette for the two categories the theme has no token for (DESIGN.md cat-do and
// cat-night). Map-only: these never appear outside pins, pin icons and filter-chip icons.
export const CAT_DO = "#5FC0C8"; // dusk teal
export const CAT_NIGHT = "#F0789A"; // dusk rose

// One color per category so the map reads at a glance. Stay is gold, food is the sunset
// accent; green stays reserved for success.
export const categoryMeta: Record<PlaceCategory, Meta> = {
  hotel: { label: "Hotel", chip: "Stay", color: colors.gold, Icon: Bed },
  food: { label: "Food", chip: "Food", color: colors.accent, Icon: ForkKnife },
  activity: { label: "Thing to do", chip: "Do", color: CAT_DO, Icon: Ticket },
  nightlife: { label: "Nightlife", chip: "Night", color: CAT_NIGHT, Icon: Martini },
};

export const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "hotel", label: categoryMeta.hotel.chip },
  { id: "food", label: categoryMeta.food.chip },
  { id: "activity", label: categoryMeta.activity.chip },
  { id: "nightlife", label: categoryMeta.nightlife.chip },
];

export const sourceLabel = {
  google_places: "via Google Places",
  serpapi_hotels: "via SerpAPI Hotels",
  serpapi_flights: "via SerpAPI Flights",
} as const;
