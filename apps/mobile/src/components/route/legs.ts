import type { GlobeArc, GlobePoint } from "@/components/globe/GlobeScene";
import { driveCostPerPerson, groupSize } from "@/lib/pricing";
import type { Flight, Trip, TripLeg } from "@/mocks/types";

// One leg of the route as the screen shows it: how the group gets there, the flight
// options (if flying), the picked one, and what it costs each person.
export type LegPlan = {
  key: string;
  leg: TripLeg;
  mode: "fly" | "drive";
  options: Flight[]; // empty when driving or when an earlier round-trip fare covers it
  picked?: Flight;
  perPerson: number;
};

// `driving` is the group's "Drive" answer: it turns every leg into a drive.
export function planLegs(
  trip: Trip,
  flights: Flight[],
  picks: string[],
  driving: boolean,
): LegPlan[] {
  const people = groupSize(trip);
  return trip.legs.map((leg, i) => {
    const key = `${i}-${leg.from}-${leg.to}`;
    const mode = driving || leg.mode === "drive" ? "drive" : "fly";
    if (mode === "drive") {
      const perPerson = leg.driveMiles ? driveCostPerPerson(leg.driveMiles, people) : 0;
      return { key, leg, mode, options: [], perPerson };
    }
    const options = (leg.flightIds ?? []).flatMap((id) => flights.filter((f) => f.id === id));
    const picked = options.find((f) => picks.includes(f.id));
    return { key, leg, mode, options, picked, perPerson: picked?.pricePerPerson ?? 0 };
  });
}

export const travelPerPerson = (legs: LegPlan[]) => legs.reduce((sum, l) => sum + l.perPerson, 0);

// Gas only, for the booked screen (flights there come from the picks themselves).
export const gasPerPerson = (legs: LegPlan[]) =>
  legs.reduce((sum, l) => sum + (l.mode === "drive" ? l.perPerson : 0), 0);

// Points and arcs for the globe: the origin, every stop, and one arc per leg (drawn as a
// drive when the group drives it). Focus is the stop for one-city trips, else the stops'
// middle, so the whole route fits in view.
export function globeRoute(trip: Trip, legs: LegPlan[]) {
  const coords = new Map<string, { lat: number; lng: number }>([
    [trip.origin.city, { lat: trip.origin.lat, lng: trip.origin.lng }],
    ...trip.stops.map((s) => [s.city, { lat: s.lat, lng: s.lng }] as const),
  ]);
  const points: GlobePoint[] = [
    { kind: "origin", lat: trip.origin.lat, lng: trip.origin.lng },
    ...trip.stops.map((s) => ({ kind: "stop" as const, lat: s.lat, lng: s.lng })),
  ];
  // A return leg over the same path (Denver -> Austin) would redraw the same arc.
  const seen = new Set<string>();
  const arcs: GlobeArc[] = legs.flatMap((l) => {
    const from = coords.get(l.leg.from);
    const to = coords.get(l.leg.to);
    const pair = [l.leg.from, l.leg.to].sort().join("|");
    if (!from || !to || seen.has(pair)) return [];
    seen.add(pair);
    return [{ from, to, mode: l.mode }];
  });
  const stops = trip.stops.length > 0 ? trip.stops : [trip.destination];
  const focus = {
    lat: stops.reduce((s, p) => s + p.lat, 0) / stops.length,
    lng: stops.reduce((s, p) => s + p.lng, 0) / stops.length,
  };
  return { points, arcs, focus };
}

// City -> airport code for leg labels ("AUS → DEN"), falling back to the city name.
export function airportFor(trip: Trip, city: string) {
  if (city === trip.origin.city) return trip.origin.airport;
  return trip.stops.find((s) => s.city === city)?.airport ?? city;
}
