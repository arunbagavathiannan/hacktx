import { type HotelsResponse, serpapiHotelsDenver } from "../mocks/serpapi-hotels.ts";
import { nightlyCapUsd } from "../preferences.ts";
import { ENGINE_TIMEOUT_MS, liveOrFixture, serpapi } from "../serpapi.ts";
import { addFound, clampResults, count, defineTool, forModel, isDemoCity, usd } from "./helpers.ts";
import { type Option, ToolError } from "./types.ts";

interface Args {
  location: string;
  check_in_date: string;
  check_out_date: string;
  adults?: number;
  max_price_per_night?: number;
  max_results?: number;
}

export const searchHotels = defineTool<Args>({
  name: "search_hotels",
  description:
    "Search hotels on Google Hotels (via SerpAPI). `price_usd` is the total for the stay for " +
    "one room. Returns options with a `ref` to use in pin_on_map.",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: 'City or area, e.g. "Denver, CO"' },
      check_in_date: { type: "string", description: "YYYY-MM-DD" },
      check_out_date: { type: "string", description: "YYYY-MM-DD" },
      adults: { type: "integer", minimum: 1, description: "Adults per room" },
      max_price_per_night: { type: "number", description: "USD, per room" },
      max_results: { type: "integer", minimum: 1, maximum: 8 },
    },
    required: ["location", "check_in_date", "check_out_date"],
    additionalProperties: false,
  },
  describe: (a) => `Searching hotels in ${a.location}`,
  // Above the engine's own limit, with room to fall back to a fixture.
  timeoutMs: ENGINE_TIMEOUT_MS.google_hotels + 3_000,
  async run(args, ctx) {
    // The owner's budget tier caps the nightly price unless the model set its own cap.
    const cap = args.max_price_per_night ?? nightlyCapUsd(ctx.preferences);
    const { data: res, source } = await liveOrFixture<HotelsResponse>(
      "hotel",
      "google_hotels",
      () =>
        serpapi("google_hotels", {
          q: `Hotels in ${args.location}`,
          check_in_date: args.check_in_date,
          check_out_date: args.check_out_date,
          adults: args.adults ?? 2,
          max_price: cap,
          currency: "USD",
        }),
      // MOCK: fixture for the demo city only.
      () => (isDemoCity(args.location) ? serpapiHotelsDenver : null),
    );

    const hotels = (res.properties ?? [])
      .filter(
        (h) =>
          h.gps_coordinates &&
          h.rate_per_night?.extracted_lowest !== undefined &&
          h.total_rate?.extracted_lowest !== undefined,
      )
      .filter((h) => cap === undefined || (h.rate_per_night?.extracted_lowest ?? 0) <= cap)
      .sort((a, b) => (b.overall_rating ?? 0) - (a.overall_rating ?? 0))
      .slice(0, clampResults(args.max_results));

    if (hotels.length === 0) {
      throw new ToolError("No hotels under that price. Try a higher max_price_per_night.");
    }

    const options = addFound(
      ctx,
      hotels.map((h): Omit<Option, "ref"> => {
        const perNight = h.rate_per_night?.extracted_lowest ?? 0;
        const total = h.total_rate?.extracted_lowest ?? 0;
        return {
          category: "hotel",
          title: h.name,
          subtitle: [
            `${usd(perNight * 100)}/night`,
            h.overall_rating && `${h.overall_rating}★`,
            h.extracted_hotel_class && `${h.extracted_hotel_class}-star`,
          ]
            .filter(Boolean)
            .join(" · "),
          priceCents: total * 100,
          currency: "USD",
          url:
            h.link ??
            `https://www.google.com/travel/search?q=${encodeURIComponent(`${h.name} ${args.location}`)}`,
          imageUrl: h.images?.[0]?.thumbnail,
          lat: h.gps_coordinates?.latitude,
          lng: h.gps_coordinates?.longitude,
          details: {
            source: source === "serpapi" ? "serpapi_google_hotels" : "fixture_google_hotels",
            rate_per_night: perNight,
            total_rate: total,
            overall_rating: h.overall_rating,
            reviews: h.reviews,
            hotel_class: h.extracted_hotel_class,
            amenities: h.amenities,
            description: h.description,
            check_in_date: args.check_in_date,
            check_out_date: args.check_out_date,
            adults: args.adults ?? 2,
            property_token: h.property_token,
          },
        };
      }),
    );

    const cheapest = Math.min(...hotels.map((h) => h.rate_per_night?.extracted_lowest ?? 0));
    return {
      summary: `Found ${count(options.length, "hotel")} from ${usd(cheapest * 100)}/night`,
      data: options.map(forModel),
    };
  },
});
