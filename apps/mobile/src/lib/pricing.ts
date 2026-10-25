import type { Flight, Place, Trip } from "@/mocks/types";

// One place for every price calculation in the app (map footer, booked screen, share card).
// Group size is known before planning (it comes from the chat via extract_trip), so rooms
// are derived from it, never hardcoded.

// Typical per-person spend for "$"-style price tiers (food, activities without a set price).
export const PRICE_TIER: Record<string, number> = { $: 15, $$: 35, $$$: 70, $$$$: 120 };

export function groupSize(trip: Trip) {
  return Math.max(1, trip.members.length);
}

export function nightsBetween(start: string, end: string) {
  const ms = new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

// Fewest rooms that fit everyone, e.g. 5 people in rooms that sleep 4 -> 2 rooms.
export function roomsNeeded(people: number, sleepsPerRoom = 2) {
  return Math.max(1, Math.ceil(people / Math.max(1, sleepsPerRoom)));
}

export type HotelCost = { rooms: number; nights: number; total: number; perPerson: number };

export function hotelCost(hotel: Place, opts: { people: number; nights: number }): HotelCost {
  const rate = hotel.nightlyRate ?? Number(hotel.price.match(/\$(\d+)/)?.[1] ?? 0);
  const rooms = roomsNeeded(opts.people, hotel.sleepsPerRoom);
  const total = rate * rooms * opts.nights;
  return { rooms, nights: opts.nights, total, perPerson: Math.round(total / opts.people) };
}

// Per-person cost of a non-hotel place. `estimate` is true when it comes from a price tier.
export function placePerPerson(place: Place): { amount: number; estimate: boolean } {
  const exact = place.price.match(/\$(\d+)/);
  if (exact) return { amount: Number(exact[1]), estimate: false };
  return { amount: PRICE_TIER[place.price.trim()] ?? 0, estimate: true };
}

// Cheapest hotel per person that leaves the rest of the plan inside the budget.
// `otherCostsPerPerson` is everything else already in the plan (flight, tickets, food).
// Falls back to the cheapest hotel overall if none fit. Ties go to the higher rating.
export function bestHotel(
  hotels: Place[],
  opts: { people: number; nights: number; budgetPerPerson: number; otherCostsPerPerson: number },
) {
  const ranked = hotels
    .filter((h) => h.category === "hotel")
    .map((h) => ({ hotel: h, cost: hotelCost(h, opts) }))
    .sort((a, b) => a.cost.perPerson - b.cost.perPerson || b.hotel.rating - a.hotel.rating);
  const fits = ranked.find(
    (r) => r.cost.perPerson + opts.otherCostsPerPerson <= opts.budgetPerPerson,
  );
  return fits ?? ranked[0];
}

// MOCK: gas assumptions for driving legs until we have a real fuel/routing source.
// Every drive-cost number in the app comes from here.
export const DRIVE_MOCK = { mpg: 25, gasPerGallon: 3.2 };

// Per-person gas for one drive, split across the whole group (one car's worth of gas;
// the mock doesn't model a second car yet).
export function driveCostPerPerson(miles: number, people: number) {
  return Math.round(((miles / DRIVE_MOCK.mpg) * DRIVE_MOCK.gasPerGallon) / Math.max(1, people));
}

// Per-person estimate for a set of picks. Only one flight and one hotel count (the last
// picked of each), since a group books one of each.
export function estimatePerPerson(
  picks: string[],
  data: { places: Place[]; flights: Flight[]; people: number; nights: number },
) {
  const flight = [...picks]
    .reverse()
    .map((id) => data.flights.find((f) => f.id === id))
    .find(Boolean);
  const hotel = [...picks]
    .reverse()
    .map((id) => data.places.find((p) => p.id === id && p.category === "hotel"))
    .find(Boolean);
  const others = picks
    .map((id) => data.places.find((p) => p.id === id && p.category !== "hotel"))
    .filter((p): p is Place => Boolean(p));

  const total =
    (flight?.pricePerPerson ?? 0) +
    (hotel ? hotelCost(hotel, data).perPerson : 0) +
    others.reduce((sum, p) => sum + placePerPerson(p).amount, 0);
  return Math.round(total);
}

// estimatePerPerson for a one-city trip, with group size and nights taken from the trip.
// Same numbers as the map footer and the booked screen for the same picks.
export function tripPerPerson(
  picks: string[],
  data: { trip: Trip; places: Place[]; flights: Flight[] },
) {
  return estimatePerPerson(picks, {
    places: data.places,
    flights: data.flights,
    people: groupSize(data.trip),
    nights: nightsBetween(data.trip.dates.start, data.trip.dates.end),
  });
}
