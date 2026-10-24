import { placesDenverActivities, placesDenverRestaurants } from "../mocks/google-places.ts";
import { addFound, clampResults, count, defineTool, forModel, requireDemoCity } from "./helpers.ts";
import type { Option } from "./types.ts";

interface Args {
  kind: "restaurant" | "activity";
  query: string;
  location: string;
  max_results?: number;
}

const priceSymbols: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export const searchPlaces = defineTool<Args>({
  name: "search_places",
  description:
    "Search Google Places for restaurants or things to do near the destination. Returns " +
    "options with a `ref` to use in pin_on_map. Places have no fixed price.",
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
    // MOCK: fixture response. Swap for a POST to https://places.googleapis.com/v1/places:searchText.
    requireDemoCity(args.location, "places");
    const res = args.kind === "restaurant" ? placesDenverRestaurants : placesDenverActivities;
    const places = [...res.places]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, clampResults(args.max_results));

    const options = addFound(
      ctx,
      places.map((p): Omit<Option, "ref"> => {
        const price = p.priceLevel ? priceSymbols[p.priceLevel] : undefined;
        return {
          category: args.kind,
          title: p.displayName.text,
          subtitle: [p.primaryTypeDisplayName.text, price, `${p.rating}★`]
            .filter(Boolean)
            .join(" · "),
          currency: "USD",
          url: p.googleMapsUri,
          lat: p.location.latitude,
          lng: p.location.longitude,
          details: {
            source: "google_places",
            place_id: p.id,
            address: p.formattedAddress,
            rating: p.rating,
            user_rating_count: p.userRatingCount,
            price_level: p.priceLevel,
          },
        };
      }),
    );

    return {
      summary: `Found ${count(options.length, args.kind)}`,
      data: options.map(forModel),
    };
  },
});
