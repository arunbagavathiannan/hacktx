import { Bed, ForkKnife, type Icon, Martini, Ticket } from "phosphor-react-native";
import type { PlaceCategory } from "@/mocks/types";
import { colors } from "@/theme";

export type Filter = "all" | PlaceCategory;

type Meta = { label: string; chip: string; color: string; Icon: Icon };

// One color per category so the map reads at a glance. Theme colors where they fit.
export const categoryMeta: Record<PlaceCategory, Meta> = {
  hotel: { label: "Hotel", chip: "Stay", color: colors.gold, Icon: Bed },
  food: { label: "Food", chip: "Food", color: colors.accent, Icon: ForkKnife },
  activity: { label: "Thing to do", chip: "Do", color: colors.good, Icon: Ticket },
  nightlife: { label: "Nightlife", chip: "Night", color: "#B9A5FF", Icon: Martini },
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
