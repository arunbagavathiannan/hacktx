import { flights, places, trip } from "@/mocks";
import { booking } from "@/mocks/booked";
import type { PlaceCategory } from "@/mocks/types";

export type ItemKind = "flight" | PlaceCategory;

export type PlanItem = {
  id: string;
  kind: ItemKind;
  title: string;
  detail: string;
  price: string; // what the row shows on the right: "$142" or "$$"
  perPerson: number | null; // null when the source has no fixed price (e.g. "$$" food)
};

const order: ItemKind[] = ["flight", "hotel", "activity", "food", "nightlife"];

const usd = (n: number) => `$${Math.round(n)}`;

// "$249/night" -> 249, "Show tickets from $65" -> 65, "$$" -> null
function dollars(price: string): number | null {
  const m = price.match(/\$(\d[\d,]*)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function resolve(id: string): PlanItem | null {
  const flight = flights.find((f) => f.id === id);
  if (flight) {
    return {
      id,
      kind: "flight",
      title: `${flight.airline} · ${flight.depart}`,
      detail: `${trip.origin.airport} → DEN · ${flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`} · round trip`,
      price: usd(flight.pricePerPerson),
      perPerson: flight.pricePerPerson,
    };
  }

  const place = places.find((p) => p.id === id);
  if (!place) return null;

  if (place.category === "hotel") {
    const nightly = dollars(place.price);
    const { nights, rooms } = booking.stay;
    const perPerson = nightly === null ? null : (nightly * nights * rooms) / trip.members.length;
    return {
      id,
      kind: "hotel",
      title: place.name,
      detail: `${nights} nights · ${rooms} rooms · ${place.price}`,
      price: perPerson === null ? place.price : usd(perPerson),
      perPerson,
    };
  }

  const perPerson = dollars(place.price);
  return {
    id,
    kind: place.category,
    title: place.name,
    detail: place.hours ?? place.distanceLabel,
    price: perPerson === null ? place.price : usd(perPerson),
    perPerson,
  };
}

export function summarize(picks: string[]) {
  const items = picks
    .map(resolve)
    .filter((i): i is PlanItem => i !== null)
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  const total = items.reduce((sum, i) => sum + (i.perPerson ?? 0), 0);
  const budget = trip.budgetPerPerson;
  const flight = items.find((i) => i.kind === "flight") ?? null;
  const hotel = items.find((i) => i.kind === "hotel") ?? null;
  const headline =
    items.find((i) => i.kind === "activity") ??
    items.find((i) => i.kind === "food" || i.kind === "nightlife") ??
    null;

  return { items, total: Math.round(total), budget, flight, hotel, headline };
}

export type PlanSummary = ReturnType<typeof summarize>;

// Plain text that goes back to the group chat with (or instead of) the card image.
export function shareText({ items, total, budget }: PlanSummary) {
  const lines = [
    `${trip.title} is booked: ${trip.dates.label}`,
    ...items.map((i) => `- ${i.title} (${i.price}${i.perPerson === null ? "" : " each"})`),
    items.length > 0 ? `About ${usd(total)} each (budget ${usd(budget)})` : null,
    "Planned with Huddle",
  ];
  return lines.filter(Boolean).join("\n");
}
