import { serpapiHotelsDenver } from "../mocks/serpapi-hotels.ts";
import {
  addFound,
  clampResults,
  count,
  defineTool,
  forModel,
  requireDemoCity,
  usd,
} from "./helpers.ts";
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
    "Search hotels on Google Hotels. `price_usd` is the total for the stay for one room. " +
    "Returns options with a `ref` to use in pin_on_map.",
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
  async run(args, ctx) {
    // MOCK: fixture response. Swap for a fetch to https://serpapi.com/search?engine=google_hotels.
    requireDemoCity(args.location, "hotel");
    const hotels = serpapiHotelsDenver.properties
      .filter(
        (h) =>
          args.max_price_per_night === undefined ||
          h.rate_per_night.extracted_lowest <= args.max_price_per_night,
      )
      .sort((a, b) => b.overall_rating - a.overall_rating)
      .slice(0, clampResults(args.max_results));

    if (hotels.length === 0) {
      throw new ToolError("No hotels under that price. Try a higher max_price_per_night.");
    }

    const options = addFound(
      ctx,
      hotels.map(
        (h): Omit<Option, "ref"> => ({
          category: "hotel",
          title: h.name,
          subtitle: `${h.rate_per_night.lowest}/night · ${h.overall_rating}★ · ${h.extracted_hotel_class}-star`,
          priceCents: h.total_rate.extracted_lowest * 100,
          currency: "USD",
          url: h.link,
          lat: h.gps_coordinates.latitude,
          lng: h.gps_coordinates.longitude,
          details: {
            source: "serpapi_google_hotels",
            rate_per_night: h.rate_per_night.extracted_lowest,
            total_rate: h.total_rate.extracted_lowest,
            overall_rating: h.overall_rating,
            reviews: h.reviews,
            hotel_class: h.extracted_hotel_class,
            amenities: h.amenities,
            description: h.description,
            check_in_date: args.check_in_date,
            check_out_date: args.check_out_date,
          },
        }),
      ),
    );

    const cheapest = Math.min(...hotels.map((h) => h.rate_per_night.extracted_lowest));
    return {
      summary: `Found ${count(options.length, "hotel")} from ${usd(cheapest * 100)}/night`,
      data: options.map(forModel),
    };
  },
});
