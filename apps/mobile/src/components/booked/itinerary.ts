import { groupSize, hotelCost, nightsBetween, placePerPerson } from "@/lib/pricing";
import type { Flight, Place, PlaceCategory, Trip } from "@/mocks/types";

// Turns the user's picks (Flight.id / Place.id) into a day-by-day itinerary, a per-person
// cost estimate, and the short text summary that goes back to the group chat. All price math
// comes from lib/pricing, so the total matches the map footer's estimatePerPerson (plus any
// extra hotel night an early flight needs).

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// A flight's departure starts with its weekday: "Fri 7:05 AM".
const FLIGHT_TIME_RE = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i;
// Only an explicit show/event time pins a place to a day: "Show Sun 7 PM". Opening hours like
// "Closed Mon" or "Mon–Sat 10 AM–9 PM" say nothing about when the group goes.
const EVENT_TIME_RE =
  /^(?:Show|Event)\s+(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i;

export type Item =
  | { kind: "flight"; id: string; flight: Flight; perPerson: number }
  | { kind: "place"; id: string; place: Place; perPerson: number; estimate: boolean }
  // An extra hotel night before the trip starts (early flight). Its cost is in the stay.
  | { kind: "checkin"; id: string; place: Place; perPerson: 0 };

export type Stay = {
  place: Place;
  nights: number;
  extraNights: number;
  rooms: number; // derived from group size and the room's capacity (lib/pricing)
  sleepsPerRoom?: number;
  nightly: number; // per room
  perPerson: number;
};

export type Day = { key: string; weekday: string; label: string; items: Item[] };

export type Itinerary = {
  days: Day[];
  stays: Stay[];
  nights: number;
  perPerson: number;
  fitsBudget: boolean;
  // Picking two hotels or two flights counts only the latest one; these lines say so.
  notes: string[];
  empty: boolean;
};

type TripDay = { weekday: string; label: string; offset: number };

function parseDate(iso: string) {
  // Noon UTC so the weekday never shifts with the device's time zone.
  return new Date(`${iso}T12:00:00Z`);
}

function dayAt(start: Date, offset: number): TripDay {
  const d = new Date(start.getTime() + offset * 86_400_000);
  return {
    weekday: WEEKDAYS[d.getUTCDay()],
    label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
    offset,
  };
}

function tripDays(trip: Trip): TripDay[] {
  const start = parseDate(trip.dates.start);
  const nights = nightsBetween(trip.dates.start, trip.dates.end);
  return Array.from({ length: nights + 1 }, (_, i) => dayAt(start, i));
}

// "Nov 13–15" (or "Nov 30 – Dec 2" across months).
export function shortDates(trip: Trip) {
  const s = parseDate(trip.dates.start);
  const e = parseDate(trip.dates.end);
  const sm = MONTHS[s.getUTCMonth()];
  const em = MONTHS[e.getUTCMonth()];
  if (sm === em) return `${sm} ${s.getUTCDate()}–${e.getUTCDate()}`;
  return `${sm} ${s.getUTCDate()} – ${em} ${e.getUTCDate()}`;
}

function compact(m: RegExpMatchArray) {
  return `${m[1]} ${m[2]}${m[3].toLowerCase()}`;
}

// "Fri 7:05 AM" -> "Fri 7:05am". Null when it doesn't start with a weekday and time.
export function shortTime(text: string | undefined) {
  const m = text?.match(FLIGHT_TIME_RE);
  return m ? compact(m) : null;
}

// A place's explicit show/event time, e.g. "Show Sun 7 PM" -> "Sun 7pm". Null otherwise.
export function eventTime(place: Place) {
  const m = place.hours?.match(EVENT_TIME_RE);
  return m ? compact(m) : null;
}

// The day a flight leaves: its departure weekday, inside the trip or just around it
// (e.g. a Thursday-night flight before a Friday start).
function flightDay(flight: Flight, days: TripDay[], start: Date) {
  const named = flight.depart.match(FLIGHT_TIME_RE)?.[1];
  if (!named) return days[0];
  const inTrip = days.find((d) => d.weekday === named);
  if (inTrip) return inTrip;
  for (const offset of [-1, -2, -3, days.length, days.length + 1, days.length + 2]) {
    const d = dayAt(start, offset);
    if (d.weekday === named) return d;
  }
  return days[0];
}

// The day a place goes on: its explicit show/event day if that's during the trip; otherwise
// nightlife goes on the first night and everything else on the first full day.
function placeDay(place: Place, days: TripDay[]) {
  const named = place.hours?.match(EVENT_TIME_RE)?.[1];
  const inTrip = named ? days.find((d) => d.weekday === named) : undefined;
  if (inTrip) return inTrip;
  if (place.category === "nightlife") return days[0];
  return days[Math.min(1, days.length - 1)];
}

export function buildItinerary(
  picks: string[],
  trip: Trip,
  flights: Flight[],
  places: Place[],
): Itinerary {
  const start = parseDate(trip.dates.start);
  const days = tripDays(trip);
  const nights = nightsBetween(trip.dates.start, trip.dates.end);
  const people = groupSize(trip);
  const groups = new Map<number, Day>();
  const notes: string[] = [];

  const push = (day: TripDay, item: Item) => {
    let group = groups.get(day.offset);
    if (!group) {
      group = { key: `d${day.offset}`, weekday: day.weekday, label: day.label, items: [] };
      groups.set(day.offset, group);
    }
    group.items.push(item);
  };

  // One flight and one hotel per trip: if several were picked, the latest pick counts.
  const pickedFlights = picks.flatMap((id) => flights.filter((f) => f.id === id));
  const pickedPlaces = picks.flatMap((id) => places.filter((p) => p.id === id));
  const hotels = pickedPlaces.filter((p) => p.category === "hotel");
  const flight: Flight | undefined = pickedFlights[pickedFlights.length - 1];
  const hotel: Place | undefined = hotels[hotels.length - 1];
  if (flight && pickedFlights.length > 1) {
    notes.push(
      `${pickedFlights.length} flights picked. Counting ${flight.airline}, your latest pick.`,
    );
  }
  if (hotel && hotels.length > 1) {
    notes.push(`${hotels.length} hotels picked. Counting ${hotel.name}, your latest pick.`);
  }

  // A flight that leaves before the trip starts needs a hotel night that early too.
  let extraNights = 0;
  if (flight) {
    const day = flightDay(flight, days, start);
    extraNights = Math.max(0, -day.offset);
    push(day, { kind: "flight", id: flight.id, flight, perPerson: flight.pricePerPerson });
    if (hotel && extraNights > 0) {
      push(day, { kind: "checkin", id: `checkin-${hotel.id}`, place: hotel, perPerson: 0 });
    }
  }

  for (const place of pickedPlaces) {
    if (place.category === "hotel") continue;
    const cost = placePerPerson(place);
    push(placeDay(place, days), {
      kind: "place",
      id: place.id,
      place,
      perPerson: cost.amount,
      estimate: cost.estimate,
    });
  }

  const stays: Stay[] = [];
  if (hotel) {
    // Rooms come from group size and room capacity; nights include any early-flight night.
    const cost = hotelCost(hotel, { people, nights: nights + extraNights });
    stays.push({
      place: hotel,
      nights: cost.nights,
      extraNights,
      rooms: cost.rooms,
      sleepsPerRoom: hotel.sleepsPerRoom,
      nightly: cost.total / Math.max(1, cost.rooms * cost.nights),
      perPerson: cost.perPerson,
    });
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => a - b).map(([, d]) => d);
  for (const day of sorted) {
    // Flights first, then the order the user picked things.
    day.items.sort((a, b) => Number(b.kind === "flight") - Number(a.kind === "flight"));
  }

  const perPerson =
    sorted.reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.perPerson, 0), 0) +
    stays.reduce((s, st) => s + st.perPerson, 0);

  return {
    days: sorted,
    stays,
    nights: nights + extraNights,
    perPerson,
    fitsBudget: perPerson <= trip.budgetPerPerson,
    notes,
    empty: sorted.length === 0 && stays.length === 0,
  };
}

// "Under $400" only when strictly under; exactly on it reads "on budget".
export function budgetPhrase(it: Itinerary, trip: Trip) {
  if (it.perPerson < trip.budgetPerPerson) return `under $${trip.budgetPerPerson}`;
  if (it.perPerson === trip.budgetPerPerson) return "on budget";
  return null;
}

// "The Crawford Hotel" -> "The Crawford", "Snooze, an A.M. Eatery" -> "Snooze".
export function shortName(name: string) {
  return name
    .split(",")[0]
    .replace(/\s+(Hotel|Amphitheatre|Amphitheater)$/i, "")
    .trim();
}

const EMOJI: Record<PlaceCategory, string> = {
  hotel: "🏨",
  food: "🍽️",
  activity: "🎟️",
  nightlife: "🍸",
};

// One line for the group chat, e.g.
// "Denver Nov 13–15 ✈️ Southwest Fri 7:05am · 🏨 Kimpton Hotel Born · 🎶 Red Rocks Sun 7pm · ~$382 each. Planned with Huddle"
export function summaryText(trip: Trip, it: Itinerary) {
  const parts: string[] = [];
  const items = it.days.flatMap((d) => d.items);
  for (const item of items) {
    if (item.kind !== "flight") continue;
    parts.push(`✈️ ${item.flight.airline} ${shortTime(item.flight.depart) ?? item.flight.depart}`);
  }
  for (const stay of it.stays) parts.push(`🏨 ${shortName(stay.place.name)}`);
  for (const item of items) {
    if (item.kind !== "place") continue;
    const { place } = item;
    const emoji = place.hours?.startsWith("Show") ? "🎶" : EMOJI[place.category];
    const when = eventTime(place);
    parts.push(`${emoji} ${shortName(place.name)}${when ? ` ${when}` : ""}`);
  }
  const head = `${trip.destination.city} ${shortDates(trip)}`;
  const body = parts.length ? ` ${parts.join(" · ")} · ` : " · ";
  return `${head}${body}~$${it.perPerson} each. Planned with Huddle`;
}
