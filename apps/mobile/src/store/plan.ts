import { create } from "zustand";
import { planLegs, travelPerPerson } from "@/components/route/legs";
import {
  bestHotel,
  estimatePerPerson,
  groupSize,
  nightsBetween,
  placePerPerson,
} from "@/lib/pricing";
import {
  type DestinationSuggestion,
  destinationById,
  destinationSuggestions,
} from "@/mocks/destinations";
import type { Flight, Place, Trip } from "@/mocks/types";

type State = {
  answers: Record<string, string>; // Clarification.id -> chosen option
  // Place.id / Flight.id the user added to the plan, for the current destination (see
  // useDestination). Choosing a different destination starts its default plan.
  picks: string[];
  // DestinationSuggestion.id the group chose on /plan/destinations; null until they choose.
  destinationId: string | null;
  answer: (clarificationId: string, option: string) => void;
  chooseDestination: (id: string) => void;
  // Places toggle on and off. Flights are radio: the group flies on the same plane, so
  // picking one replaces any other flight in the plan.
  togglePick: (id: string) => void;
  // Radio pick within one group of flight options (one leg of a multi-city route).
  // Picking the flight that's already picked keeps it.
  pickFlight: (id: string, among?: string[]) => void;
  reset: () => void;
};

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

const byVotes = (a: { pickedBy: string[] }, b: { pickedBy: string[] }) =>
  b.pickedBy.length - a.pickedBy.length;

// Default plan for one destination, so it's never empty in the demo: the group's most-picked
// flight and its headline show/spot, plus the best hotel for this group size within budget
// (see bestHotel).
export function defaultPicksFor(dest: DestinationSuggestion) {
  const defaults = ruleBasedPicks(dest);
  // Live plans start from the agent's own choice in each category (lib/live.ts). A category the
  // agent didn't choose in (e.g. an older plan) keeps the default, so no part goes missing.
  const chosenFlights = dest.flights.filter((f) => f.chosen).map((f) => f.id);
  const chosenPlaces = dest.places.filter((p) => p.chosen);
  if (chosenFlights.length === 0 && chosenPlaces.length === 0) return defaults;
  const categoryOf = (id: string) =>
    dest.flights.some((f) => f.id === id)
      ? "flight"
      : dest.places.find((p) => p.id === id)?.category;
  const covered = new Set([
    ...(chosenFlights.length ? ["flight"] : []),
    ...chosenPlaces.map((p) => p.category),
  ]);
  return [
    ...chosenFlights,
    ...chosenPlaces.map((p) => p.id),
    ...defaults.filter((id) => !covered.has(categoryOf(id) ?? "")),
  ];
}

// The mock demo's picks: the most-voted flight, the headline show, the best-fit hotel.
function ruleBasedPicks(dest: DestinationSuggestion) {
  const { trip } = dest;
  const flight = [...dest.flights].sort(byVotes)[0];
  const show = dest.places.find((p) => p.id === dest.headlinePlaceId);
  const hotel = bestHotel(dest.places, {
    people: groupSize(trip),
    nights: nightsBetween(trip.dates.start, trip.dates.end),
    budgetPerPerson: trip.budgetPerPerson,
    otherCostsPerPerson: (flight?.pricePerPerson ?? 0) + (show ? placePerPerson(show).amount : 0),
  });
  return [flight?.id, hotel?.hotel.id, show?.id].filter((id): id is string => Boolean(id));
}

// The one per-person estimate every screen shows (map footer, destination ticket and rows,
// summary teaser, home card): the picked places and hotel, plus each leg's flight, or split
// gas when the group drives. The hotel is priced for the first stop's nights, which on a
// one-city trip is the whole trip. Booked builds its itinerary from the same lib/pricing
// pieces, so it lands on the same number (plus any extra night an early flight needs).
export function planPerPerson(
  plan: { trip: Trip; flights: Flight[]; places: Place[] },
  picks: string[],
  driving: boolean,
) {
  const { trip } = plan;
  const stop = trip.stops[0];
  const nights = stop
    ? nightsBetween(stop.arrive, stop.depart)
    : nightsBetween(trip.dates.start, trip.dates.end);
  // Flights are counted per leg below, so places-only here (flight ids don't match a place).
  const stay = estimatePerPerson(picks, {
    places: plan.places,
    flights: [],
    people: groupSize(trip),
    nights,
  });
  return stay + travelPerPerson(planLegs(trip, plan.flights, picks, driving));
}

// What a destination's default plan costs each person, flying or driving.
export function defaultEstimateFor(dest: DestinationSuggestion, driving = false) {
  return planPerPerson(dest, defaultPicksFor(dest), driving);
}

// Every suggestion with its default plan estimate, in the planner's order.
export function destinationEstimates(driving = false) {
  return destinationSuggestions.map((d) => ({
    destination: d,
    perPerson: defaultEstimateFor(d, driving),
  }));
}

// The group's "Fly or drive?" answer, as a boolean.
export function useDriving() {
  return isDriving(usePlan((s) => s.answers));
}

// The destination the post-pick screens (map, booked, home card) show. Before the group picks
// it's the leading idea (MOCK: only reachable by direct link, e.g. PR screenshots).
export function useDestination() {
  return destinationById(usePlan((s) => s.destinationId));
}

const flightIdsOf = (destinationId: string | null) =>
  destinationById(destinationId).flights.map((f) => f.id);

export const usePlan = create<State>()((set) => ({
  answers: {},
  picks: defaultPicksFor(destinationById(null)),
  destinationId: null,
  answer: (clarificationId, option) =>
    set((s) => ({ answers: { ...s.answers, [clarificationId]: option } })),
  // Re-choosing the same city keeps its picks; a different city starts from its defaults.
  chooseDestination: (id) =>
    set((s) =>
      s.destinationId === id
        ? {}
        : { destinationId: id, picks: defaultPicksFor(destinationById(id)) },
    ),
  togglePick: (id) =>
    set((s) => {
      const flightIds = flightIdsOf(s.destinationId);
      if (flightIds.includes(id)) return { picks: withFlight(s.picks, id, flightIds) };
      return { picks: togglePlace(s.picks, id) };
    }),
  pickFlight: (id, among) =>
    set((s) => ({ picks: withFlight(s.picks, id, among ?? flightIdsOf(s.destinationId)) })),
  reset: () =>
    set({ answers: {}, picks: defaultPicksFor(destinationById(null)), destinationId: null }),
}));
