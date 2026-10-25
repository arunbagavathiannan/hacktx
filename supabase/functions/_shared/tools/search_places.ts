import {
  type MapsResponse,
  mapsDenverActivities,
  mapsDenverRestaurants,
} from "../mocks/serpapi-maps.ts";
import { liveOrFixture, serpapi } from "../serpapi.ts";
import { addFound, clampResults, count, defineTool, forModel, isDemoCity } from "./helpers.ts";
import type { Option } from "./types.ts";

interface Args {
  kind: "restaurant" | "activity";
  query: string;
  location: string;
  max_results?: number;
}

const mapsUrl = (title: string, location: string, placeId?: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title} ${location}`)}` +
  (placeId && !placeId.startsWith("mock_") ? `&query_place_id=${placeId}` : "");

export const searchPlaces = defineTool<Args>({
  name: "search_places",
  description:
    "Search Google Maps (via SerpAPI) for restaurants or things to do near the destination. " +
    "Returns options with a `ref` to use in pin_on_map. Places have no fixed price.",
  parameters: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["restaurant", "activity"] },
      query: { type: "string", description: 'What to look for, e.g. "dinner in RiNo"' },
      location: { type: "string", description: 'City or area, e.g. "Denver, CO"' },
      max_results: { type: "integer", minimum: 1, maximum: 8 },
    },
    required: ["kind", "query", "location"],
    additionalProperties: false,
  },
  describe: (a) =>
    `Finding ${a.kind === "restaurant" ? "places to eat" : "things to do"} in ${a.location}`,
  async run(args, ctx) {
    const { data: res, source } = await liveOrFixture<MapsResponse>(
      "places",
      () =>
        serpapi("google_maps", {
          type: "search",
          q: `${args.query} in ${args.location}`,
        }),
      // MOCK: fixture for the demo city only.
      () =>
        isDemoCity(args.location)
          ? args.kind === "restaurant"
            ? mapsDenverRestaurants
            : mapsDenverActivities
          : null,
    );

    const found = res.local_results?.length
      ? res.local_results
      : res.place_results
        ? [res.place_results]
        : [];
    const places = found
      .filter((p) => p.gps_coordinates)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, clampResults(args.max_results));

    const options = addFound(
      ctx,
      places.map(
        (p): Omit<Option, "ref"> => ({
          category: args.kind,
          title: p.title,
          subtitle: [p.type, p.price, p.rating && `${p.rating}★`].filter(Boolean).join(" · "),
          currency: "USD",
          url: mapsUrl(p.title, args.location, p.place_id),
          imageUrl: p.thumbnail,
          lat: p.gps_coordinates?.latitude,
          lng: p.gps_coordinates?.longitude,
          details: {
            source: source === "serpapi" ? "serpapi_google_maps" : "fixture_google_maps",
            place_id: p.place_id,
            address: p.address,
            rating: p.rating,
            reviews: p.reviews,
            price: p.price,
          },
        }),
      ),
    );

    return {
      summary: `Found ${count(options.length, args.kind)}`,
      data: options.map(forModel),
    };
  },
});
