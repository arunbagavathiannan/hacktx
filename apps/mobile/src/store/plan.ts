import { create } from "zustand";
import { bestHotel, groupSize, nightsBetween, placePerPerson } from "@/lib/pricing";
import { flights, places, trip } from "@/mocks";

type State = {
  answers: Record<string, string>; // Clarification.id -> chosen option
  picks: string[]; // Place.id / Flight.id the user added to the plan
  answer: (clarificationId: string, option: string) => void;
  togglePick: (id: string) => void;
  reset: () => void;
};

// Default plan, so it's never empty in the demo: the group's most-picked flight and
// activity, plus the best hotel for this group size within budget (see bestHotel).
function defaultPicks() {
  const flight = flights[0];
  const show = places.find((p) => p.id === "a1");
  const hotel = bestHotel(places, {
    people: groupSize(trip),
    nights: nightsBetween(trip.dates.start, trip.dates.end),
    budgetPerPerson: trip.budgetPerPerson,
    otherCostsPerPerson: (flight?.pricePerPerson ?? 0) + (show ? placePerPerson(show).amount : 0),
  });
  return [flight?.id, hotel?.hotel.id, show?.id].filter((id): id is string => Boolean(id));
}

export const usePlan = create<State>()((set) => ({
  answers: {},
  picks: defaultPicks(),
  answer: (clarificationId, option) =>
    set((s) => ({ answers: { ...s.answers, [clarificationId]: option } })),
  togglePick: (id) =>
    set((s) => ({
      picks: s.picks.includes(id) ? s.picks.filter((p) => p !== id) : [...s.picks, id],
    })),
  reset: () => set({ answers: {}, picks: defaultPicks() }),
}));
