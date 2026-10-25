import { type Icon, SunHorizon, Waves } from "phosphor-react-native";

export type PastTrip = {
  id: string;
  title: string;
  when: string;
  people: number;
  perPerson: number;
  icon: Icon;
};

// MOCK: past plans so Home doesn't look empty in the demo. Real ones come from Supabase `plans`.
export const pastTrips: PastTrip[] = [
  {
    id: "past-port-a",
    title: "Port Aransas beach day",
    when: "Sep 2026",
    people: 6,
    perPerson: 48,
    icon: Waves,
  },
  {
    id: "past-marfa",
    title: "Marfa road trip",
    when: "Mar 2026",
    people: 4,
    perPerson: 165,
    icon: SunHorizon,
  },
];
