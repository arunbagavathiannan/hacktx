import { type FlightsResponse, serpapiFlightsAusDen } from "../mocks/serpapi-flights.ts";
import { liveOrFixture, serpapi } from "../serpapi.ts";
import {
  addFound,
  clampResults,
  clock,
  count,
  defineTool,
  duration,
  forModel,
  usd,
  weekday,
} from "./helpers.ts";
import { type Option, ToolError } from "./types.ts";

interface Args {
  origin: string;
  destination: string;
  outbound_date: string;
  return_date: string;
  nonstop_only?: boolean;
  max_results?: number;
}

const DEN_AIRPORT = { lat: 39.8561, lng: -104.6737 };

export const searchFlights = defineTool<Args>({
  name: "search_flights",
  description:
    "Search round-trip flights on Google Flights (via SerpAPI). Prices are per person, round " +
    "trip, in USD. Returns options with a `ref` to use in pin_on_map.",
  parameters: {
    type: "object",
    properties: {
      origin: { type: "string", description: "Origin airport IATA code, e.g. AUS" },
      destination: { type: "string", description: "Destination airport IATA code, e.g. DEN" },
      outbound_date: { type: "string", description: "YYYY-MM-DD" },
      return_date: { type: "string", description: "YYYY-MM-DD" },
      nonstop_only: { type: "boolean", description: "Only nonstop flights" },
      max_results: { type: "integer", minimum: 1, maximum: 8 },
    },
    required: ["origin", "destination", "outbound_date", "return_date"],
    additionalProperties: false,
  },
  describe: (a) => `Searching flights ${a.origin.toUpperCase()} → ${a.destination.toUpperCase()}`,
  async run(args, ctx) {
    const origin = args.origin.toUpperCase();
    const destination = args.destination.toUpperCase();

    const { data: res, source } = await liveOrFixture<FlightsResponse>(
      "flight",
      () =>
        serpapi("google_flights", {
          departure_id: origin,
          arrival_id: destination,
          outbound_date: args.outbound_date,
          return_date: args.return_date,
          type: 1,
          stops: args.nonstop_only ? 1 : 0,
          currency: "USD",
        }),
      // MOCK: fixture for the demo route only.
      () => (origin === "AUS" && destination === "DEN" ? serpapiFlightsAusDen : null),
    );

    const flights = [...(res.best_flights ?? []), ...(res.other_flights ?? [])]
      .filter((f) => f.price !== undefined && f.flights.length > 0)
      .filter((f) => !args.nonstop_only || f.flights.length === 1)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, clampResults(args.max_results));

    if (flights.length === 0) {
      throw new ToolError("No flights match. Try allowing a stop or other dates.");
    }

    // Map pin at the destination: the airport for the demo route, else the trip's city.
    const trip = (await ctx.store.getPlan(ctx.planId)).trip;
    const pin =
      destination === "DEN"
        ? DEN_AIRPORT
        : { lat: trip.destination?.lat, lng: trip.destination?.lng };
    const searchUrl =
      res.search_metadata?.google_flights_url ??
      `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights from ${origin} to ${destination} on ${args.outbound_date} through ${args.return_date}`,
      )}`;

    const options = addFound(
      ctx,
      flights.map((f): Omit<Option, "ref"> => {
        const first = f.flights[0];
        const last = f.flights[f.flights.length - 1];
        const stops = f.flights.length - 1;
        return {
          category: "flight",
          title: `${first.airline} · ${stops === 0 ? "Nonstop" : `${stops} stop`}`,
          subtitle: `${weekday(args.outbound_date)} ${clock(first.departure_airport.time)} → ${clock(last.arrival_airport.time)} · ${duration(f.total_duration)}`,
          priceCents: (f.price ?? 0) * 100,
          currency: "USD",
          url: searchUrl,
          imageUrl: f.airline_logo,
          ...pin,
          details: {
            source: source === "serpapi" ? "serpapi_google_flights" : "fixture_google_flights",
            price: f.price,
            flight_numbers: f.flights.map((leg) => leg.flight_number),
            departure_time: first.departure_airport.time,
            arrival_time: last.arrival_airport.time,
            total_duration: f.total_duration,
            stops,
            departure_id: origin,
            arrival_id: destination,
            outbound_date: args.outbound_date,
            return_date: args.return_date,
            departure_token: f.departure_token,
            booking_token: f.booking_token,
          },
        };
      }),
    );

    return {
      summary: `Found ${count(options.length, "flight")} from ${usd(options[0].priceCents ?? 0)}`,
      data: options.map(forModel),
    };
  },
});
