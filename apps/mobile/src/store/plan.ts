import { create } from "zustand";
import { bestHotel, groupSize, nightsBetween, placePerPerson } from "@/lib/pricing";
import { flights, places, trip } from "@/mocks";

type State = {
  answers: Record<string, string>; // Clarification.id -> chosen option
  picks: string[]; // Place.id / Flight.id the user added to the plan
  answer: (clarificationId: string, option: string) => void;
  // Places toggle on and off. Flights are radio: the group flies on the same plane, so
  // picking one replaces any other flight in the plan.
  togglePick: (id: string) => void;
  // Radio pick within one group of flight options (one leg of a multi-city route).
  // Picking the flight that's already picked keeps it.
  pickFlight: (id: string, among?: string[]) => void;
  reset: () => void;
};

const FLIGHT_IDS = flights.map((f) => f.id);

// The "Fly or drive?" clarification (mocks/trip.ts, id "c1").
export const TRAVEL_QUESTION_ID = "c1";

// Only an explicit "Drive" hides flights; "Fly", "Either", or no answer keeps them.
export function isDriving(answers: Record<string, string>) {
  return answers[TRAVEL_QUESTION_ID] === "Drive";
}

// Pure pick rules, shared with demo-only local state on the map screen.
// Flights are radio within `among`; places toggle.
export function withFlight(picks: string[], id: string, among: string[]) {
  return [...picks.filter((p) => p !== id && !among.includes(p)), id];
}

export function togglePlace(picks: string[], id: string) {
  return picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id];
}

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
    set((s) => {
      if (FLIGHT_IDS.includes(id)) return { picks: withFlight(s.picks, id, FLIGHT_IDS) };
      return { picks: togglePlace(s.picks, id) };
    }),
  pickFlight: (id, among = FLIGHT_IDS) => set((s) => ({ picks: withFlight(s.picks, id, among) })),
  reset: () => set({ answers: {}, picks: defaultPicks() }),
}));
