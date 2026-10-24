import type { Flight, Place, PlaceCategory, Trip } from "@/mocks/types";

// Turns the user's picks (Flight.id / Place.id) into a day-by-day itinerary, a per-person
// cost estimate, and the short text summary that goes back to the group chat.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_RE = /\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/;

// Rough per-person cost for Google Places price levels ("$$") that have no dollar amount.
const PRICE_LEVEL: Record<number, number> = { 1: 15, 2: 30, 3: 60, 4: 100 };

// Assumption: the group shares one room, so the hotel is split by everyone on the trip.
const ROOMS = 1;

export type Item =
  | { kind: "flight"; id: string; flight: Flight; perPerson: number }
  | { kind: "place"; id: string; place: Place; perPerson: number; estimate: boolean };

export type Stay = { place: Place; nights: number; nightly: number; perPerson: number };

export type Day = { key: string; weekday: string; label: string; items: Item[] };

export type Itinerary = {
  days: Day[];
  stays: Stay[];
  nights: number;
  perPerson: number;
  fitsBudget: boolean;
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
  const nights = nightsOf(trip);
  return Array.from({ length: nights + 1 }, (_, i) => dayAt(start, i));
}

function nightsOf(trip: Trip) {
  const ms = parseDate(trip.dates.end).getTime() - parseDate(trip.dates.start).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
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

function dollars(price: string) {
  const m = price.match(/\$(\d+)/);
  return m ? Number(m[1]) : null;
}

function placeCost(place: Place) {
  const exact = dollars(place.price);
  if (exact !== null) return { perPerson: exact, estimate: true };
  const level = (place.price.match(/\$/g) ?? []).length;
  return { perPerson: PRICE_LEVEL[level] ?? 0, estimate: true };
}

// Which trip day an item lands on: an explicit weekday in its time ("Fri 7:05 AM",
// "Show Sun 7 PM") wins; otherwise nightlife goes on the first night and everything else
// on the first full day.
function dayFor(
  text: string | undefined,
  category: PlaceCategory | "flight",
  days: TripDay[],
  start: Date,
) {
  const named = text?.match(DAY_RE)?.[1];
  if (named) {
    const inTrip = days.find((d) => d.weekday === named);
    if (inTrip) return inTrip;
    // A day just outside the trip (e.g. a Thursday-night flight): the nearest matching day.
    for (const offset of [-1, -2, -3, days.length, days.length + 1, days.length + 2]) {
      const d = dayAt(start, offset);
      if (d.weekday === named) return d;
    }
  }
  if (category === "nightlife" || category === "flight") return days[0];
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
  const nights = nightsOf(trip);
  const people = Math.max(1, trip.members.length);
  const groups = new Map<number, Day>();
  const stays: Stay[] = [];

  const push = (day: TripDay, item: Item) => {
    let group = groups.get(day.offset);
    if (!group) {
      group = { key: `d${day.offset}`, weekday: day.weekday, label: day.label, items: [] };
      groups.set(day.offset, group);
    }
    group.items.push(item);
  };

  for (const id of picks) {
    const flight = flights.find((f) => f.id === id);
    if (flight) {
      push(dayFor(flight.depart, "flight", days, start), {
        kind: "flight",
        id,
        flight,
        perPerson: flight.pricePerPerson,
      });
      continue;
    }
    const place = places.find((p) => p.id === id);
    if (!place) continue;
    if (place.category === "hotel") {
      const nightly = dollars(place.price) ?? 0;
      stays.push({
        place,
        nights,
        nightly,
        perPerson: Math.round((nightly * nights * ROOMS) / people),
      });
      continue;
    }
    push(dayFor(place.hours, place.category, days, start), {
      kind: "place",
      id,
      place,
      ...placeCost(place),
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
    nights,
    perPerson,
    fitsBudget: perPerson <= trip.budgetPerPerson,
    empty: sorted.length === 0 && stays.length === 0,
  };
}

// "The Crawford Hotel" -> "The Crawford", "Snooze, an A.M. Eatery" -> "Snooze".
export function shortName(name: string) {
  return name
    .split(",")[0]
    .replace(/\s+(Hotel|Amphitheatre|Amphitheater)$/i, "")
    .trim();
}

// "Show Sun 7 PM" -> "Sun 7pm", "Fri 7:05 AM" -> "Fri 7:05am". Null when there's no weekday.
export function shortTime(text: string | undefined) {
  if (!text) return null;
  const m = text.match(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i);
  if (!m) return null;
  return `${m[1]} ${m[2]}${m[3].toLowerCase()}`;
}

const EMOJI: Record<PlaceCategory, string> = {
  hotel: "🏨",
  food: "🍽️",
  activity: "🎟️",
  nightlife: "🍸",
};

// One line for the group chat, e.g.
// "Denver Nov 13–15 ✈️ Southwest Fri 7:05am · 🏨 The Crawford · 🎶 Red Rocks Sun 7pm · ~$307 each. Planned with Huddle"
export function summaryText(trip: Trip, it: Itinerary) {
  const parts: string[] = [];
  const items = it.days.flatMap((d) => d.items);
  for (const item of items.filter((i) => i.kind === "flight")) {
    parts.push(`✈️ ${item.flight.airline} ${shortTime(item.flight.depart) ?? item.flight.depart}`);
  }
  for (const stay of it.stays) parts.push(`🏨 ${shortName(stay.place.name)}`);
  for (const item of items) {
    if (item.kind !== "place") continue;
    const { place } = item;
    const emoji = place.hours?.startsWith("Show") ? "🎶" : EMOJI[place.category];
    const when = shortTime(place.hours);
    parts.push(`${emoji} ${shortName(place.name)}${when ? ` ${when}` : ""}`);
  }
  const head = `${trip.destination.city} ${shortDates(trip)}`;
  const body = parts.length ? ` ${parts.join(" · ")} · ` : " · ";
  return `${head}${body}~$${it.perPerson} each. Planned with Huddle`;
}
