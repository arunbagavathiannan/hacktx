import { AirplaneTilt, Bed, ForkKnife, type Icon, Martini, Ticket } from "phosphor-react-native";
import type { PlaceCategory } from "@/mocks/types";

// One icon per kind of pick, shared by the itinerary rows and the share card.
export const kindIcons: Record<PlaceCategory | "flight", Icon> = {
  flight: AirplaneTilt,
  hotel: Bed,
  food: ForkKnife,
  activity: Ticket,
  nightlife: Martini,
};
