import { shortName } from "@/components/booked/itinerary";
import { groupSize, hotelCost, nightsBetween } from "@/lib/pricing";
import { agentSteps, brief } from "@/mocks";
import { destinationSuggestions } from "@/mocks/destinations";
import type { AgentStep, Preferences } from "@/mocks/types";
import { defaultEstimateFor, defaultPicksFor } from "@/store/plan";

// MOCK: fills in the timeline's agentSteps (mocks/trip.ts) with numbers from the destination
// data, until the planner agent streams real agent_steps rows. Huddle has NOT picked a city:
// it suggests three and checks flights and stays for each. Every price comes through
// lib/pricing, so the timeline, the destination screen, and the map footer agree.

const STAY_LABEL: Record<NonNullable<Preferences["budget"]>, string> = {
  $: "cheap stays",
  $$: "mid-range stays",
  $$$: "nicer stays",
};

// Shown when onboarding was skipped (fresh web build, screenshots): what the chat itself says.
export const FALLBACK_PREFERENCES = "Going by the chat: live music · under $400 · Fri–Sun";

export function preferencesDetail(prefs: Preferences) {
  const parts = [
    prefs.vibes.length > 0 ? prefs.vibes.slice(0, 2).join(", ") : null,
    prefs.budget ? STAY_LABEL[prefs.budget] : null,
    prefs.maxTravel ? prefs.maxTravel.replace(/\s*\(.*\)$/, "").toLowerCase() : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : FALLBACK_PREFERENCES;
}

export function destinationSteps(prefs: Preferences): AgentStep[] {
  const people = brief.members.length;
  const nights = nightsBetween(brief.dates.start, brief.dates.end);
  const ideas = destinationSuggestions;

  // The flight and stay in each city's default plan (most-voted flight, best-fit hotel).
  const checked = ideas.map((d) => {
    const picks = defaultPicksFor(d);
    const flight = d.flights.find((f) => picks.includes(f.id));
    const place = d.places.find((p) => p.category === "hotel" && picks.includes(p.id));
    const hotel = place
      ? { hotel: place, cost: hotelCost(place, { people: groupSize(d.trip), nights }) }
      : undefined;
    return { d, flight, hotel, estimate: defaultEstimateFor(d) };
  });
  const allFit = checked.every((c) => c.estimate <= brief.budgetPerPerson);
  const flightCount = ideas.reduce((n, d) => n + d.flights.length, 0);
  const stayCount = ideas.reduce(
    (n, d) => n + d.places.filter((p) => p.category === "hotel").length,
    0,
  );
  const placeCount = ideas.reduce(
    (n, d) => n + d.places.filter((p) => p.category !== "hotel").length,
    0,
  );

  const fill: Partial<Record<AgentStep["tool"], Partial<AgentStep>>> = {
    apply_preferences: { detail: preferencesDetail(prefs) },
    suggest_destinations: {
      detail: `${ideas.length} cities fit the dates and the budget`,
      results: ideas.map((d) => ({ label: d.city, note: d.why })),
    },
    search_flights: {
      detail: `${flightCount} nonstop round trips to ${ideas.map((d) => d.airport).join(", ")}`,
      results: checked.map(({ d, flight }) => ({
        label: d.city,
        value: flight ? `$${flight.pricePerPerson}` : undefined,
        note: flight ? `${flight.airline} · ${flight.duration}` : "No nonstop found",
      })),
    },
    search_hotels: {
      detail: `${stayCount} stays · ${nights} nights · split ${people} ways`,
      results: checked.flatMap(({ d, hotel }) =>
        hotel
          ? [
              {
                label: d.city,
                value: `$${hotel.cost.perPerson} each`,
                note: shortName(hotel.hotel.name),
              },
            ]
          : [],
      ),
    },
    search_places: {
      detail: `${placeCount} spots across the ${ideas.length} cities, ready for the map`,
    },
    verify: {
      detail: allFit
        ? `Prices match sources · all ${ideas.length} fit $${brief.budgetPerPerson} each`
        : "Prices match sources · some ideas run over budget",
      results: checked.map(({ d, estimate }) => ({
        label: d.city,
        value: `~$${estimate} each`,
      })),
    },
  };

  return agentSteps.map((s) => ({ ...s, ...fill[s.tool] }));
}
