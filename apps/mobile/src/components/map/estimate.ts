import type { Flight, Place } from "@/mocks/types";

// Rough per-person cost of the picks, for the footer pill. Labeled "est." on screen.
// Hotels are one booking for the whole group, split evenly. "$$" style prices use a
// typical per-person spend for that tier.
const TIER: Record<string, number> = { $: 15, $$: 35, $$$: 70, $$$$: 120 };

export function nightsBetween(start: string, end: string) {
  const ms = new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function placeCost(place: Place, nights: number, people: number) {
  const nightly = place.price.match(/\$(\d+)\s*\/\s*night/);
  if (nightly) return (Number(nightly[1]) * nights) / Math.max(1, people);
  const amount = place.price.match(/\$(\d+)/);
  if (amount) return Number(amount[1]);
  return TIER[place.price.trim()] ?? 0;
}

export function estimatePerPerson(
  picks: string[],
  places: Place[],
  flights: Flight[],
  opts: { nights: number; people: number },
) {
  let total = 0;
  for (const id of picks) {
    const flight = flights.find((f) => f.id === id);
    if (flight) {
      total += flight.pricePerPerson;
      continue;
    }
    const place = places.find((p) => p.id === id);
    if (place) total += placeCost(place, opts.nights, opts.people);
  }
  return Math.round(total);
}
