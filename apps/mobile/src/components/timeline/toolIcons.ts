import {
  AirplaneTilt,
  Bed,
  ChatText,
  ForkKnife,
  GlobeHemisphereWest,
  type Icon,
  MapPin,
  Question,
  ShieldCheck,
  SlidersHorizontal,
} from "phosphor-react-native";
import type { AgentStep } from "@/mocks/types";

// One Phosphor icon per agent tool, so each timeline row reads at a glance.
export const toolIcons: Record<AgentStep["tool"], Icon> = {
  extract_trip: ChatText,
  apply_preferences: SlidersHorizontal,
  suggest_destinations: GlobeHemisphereWest,
  search_flights: AirplaneTilt,
  search_hotels: Bed,
  search_places: ForkKnife,
  pin_on_map: MapPin,
  verify: ShieldCheck,
  ask_user: Question,
};
