// Live SerpAPI path, with fetch stubbed so no real searches (or quota) are used.
// deno test --allow-env supabase/functions/_shared/serpapi.test.ts

import { assert, assertEquals } from "jsr:@std/assert@1";
import { demoChat } from "./mocks/demo-trip.ts";
import { runTool } from "./tools/index.ts";
import { memoryStore } from "./tools/store.ts";
import type { ToolContext } from "./tools/types.ts";

function ctx(): ToolContext {
  return {
    planId: "p",
    store: memoryStore({
      id: "p",
      status: "planning",
      title: null,
      summary: null,
      trip: { people: [], constraints: [], missing: [] },
      pendingQuestion: null,
    }),
    chat: demoChat,
    userName: "Sidd",
    found: new Map(),
    bookingConfirmed: false,
  };
}

// Runs `fn` with SERPAPI_API_KEY set and fetch answering with `respond`; returns requested URLs.
async function withSerpapi(
  respond: (url: URL) => Response,
  fn: () => Promise<void>,
): Promise<URL[]> {
  const realFetch = globalThis.fetch;
  const urls: URL[] = [];
  Deno.env.set("SERPAPI_API_KEY", "test-key");
  globalThis.fetch = (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input);
    urls.push(url);
    return Promise.resolve(respond(url));
  };
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
    Deno.env.delete("SERPAPI_API_KEY");
  }
  return urls;
}

const nyc = {
  origin: "AUS",
  destination: "JFK",
  outbound_date: "2026-12-04",
  return_date: "2026-12-06",
  nonstop_only: true,
};

Deno.test("search_flights calls SerpAPI google_flights and reads live results", async () => {
  const c = ctx();
  let result = await runTool("search_flights", "{}", c);
  const urls = await withSerpapi(
    () =>
      Response.json({
        search_metadata: { google_flights_url: "https://www.google.com/travel/flights?tfs=abc" },
        best_flights: [
          {
            flights: [
              {
                departure_airport: { id: "AUS", time: "2026-12-04 08:00" },
                arrival_airport: { id: "JFK", time: "2026-12-04 12:40" },
                airline: "JetBlue",
                flight_number: "B6 1000",
              },
            ],
            total_duration: 220,
            price: 289,
          },
        ],
        other_flights: [],
      }),
    async () => {
      result = await runTool("search_flights", JSON.stringify(nyc), c);
    },
  );

  assert(result.ok, result.summary);
  assertEquals(result.summary, "Found 1 flight from $289");
  const p = urls[0].searchParams;
  assertEquals(urls[0].pathname, "/search.json");
  assertEquals(
    [p.get("engine"), p.get("departure_id"), p.get("arrival_id"), p.get("stops"), p.get("type")],
    ["google_flights", "AUS", "JFK", "1", "1"],
  );
  assertEquals(p.get("api_key"), "test-key");
  const option = c.found.get("flight_1");
  assertEquals(option?.url, "https://www.google.com/travel/flights?tfs=abc");
  assertEquals(option?.details.source, "serpapi_google_flights");
});

Deno.test("search_places uses SerpAPI google_maps", async () => {
  const c = ctx();
  let result = await runTool("search_places", "{}", c);
  const urls = await withSerpapi(
    () =>
      Response.json({
        local_results: [
          {
            title: "Joe's Pizza",
            place_id: "ChIJ123",
            gps_coordinates: { latitude: 40.73, longitude: -73.99 },
            rating: 4.5,
            price: "$",
            type: "Pizza restaurant",
          },
          { title: "No coordinates, skipped" },
        ],
      }),
    async () => {
      result = await runTool(
        "search_places",
        JSON.stringify({ kind: "restaurant", query: "pizza", location: "New York" }),
        c,
      );
    },
  );

  assert(result.ok, result.summary);
  assertEquals(result.summary, "Found 1 restaurant");
  assertEquals(urls[0].searchParams.get("engine"), "google_maps");
  assertEquals(urls[0].searchParams.get("q"), "pizza in New York");
  assertEquals(c.found.get("restaurant_1")?.subtitle, "Pizza restaurant · $ · 4.5★");
  assert(c.found.get("restaurant_1")?.url?.endsWith("&query_place_id=ChIJ123"));
});

Deno.test("SerpAPI down: demo city falls back to the fixture, other cities fail politely", async () => {
  const c = ctx();
  let denver = await runTool("search_hotels", "{}", c);
  let paris = denver;
  await withSerpapi(
    () => Response.json({ error: "Your account has run out of searches." }, { status: 429 }),
    async () => {
      denver = await runTool(
        "search_hotels",
        JSON.stringify({
          location: "Denver, CO",
          check_in_date: "2026-11-20",
          check_out_date: "2026-11-22",
        }),
        c,
      );
      paris = await runTool(
        "search_hotels",
        JSON.stringify({
          location: "Paris",
          check_in_date: "2026-11-20",
          check_out_date: "2026-11-22",
        }),
        c,
      );
    },
  );

  assert(denver.ok, denver.summary);
  assertEquals(c.found.get("hotel_1")?.details.source, "fixture_google_hotels");
  assert(!paris.ok);
  assertEquals(paris.summary, "hotel search is down right now. Carry on without it.");
});

// One stubbed SerpAPI that answers every call the demo booking makes.
function fakeSerpapi(url: URL): Response {
  const p = url.searchParams;
  const leg = (from: string, to: string, time: string) => ({
    departure_airport: { id: from, time },
    arrival_airport: { id: to, time },
    airline: "Frontier",
    flight_number: "F9 2316",
  });
  if (p.get("booking_token") === "BOOK_RETURN_1") {
    return Response.json({
      booking_options: [
        { together: { book_with: "Expedia", price: 171, booking_phone: "1 (800) 397-3342" } },
        {
          together: {
            book_with: "Frontier",
            price: 158,
            booking_request: { url: "https://www.google.com/travel/clk/f", post_data: "u=abc" },
          },
        },
        { separate_tickets: true },
      ],
    });
  }
  if (p.get("departure_token") === "DEP_1") {
    return Response.json({
      best_flights: [
        {
          flights: [leg("DEN", "AUS", "2026-11-22 18:00")],
          total_duration: 125,
          price: 164,
          booking_token: "BOOK_RETURN_1",
        },
      ],
    });
  }
  if (p.get("property_token") === "PROP_CATBIRD") {
    return Response.json({
      featured_prices: [
        {
          source: "Catbird",
          official: true,
          link: "https://catbird.example/book",
          total_rate: { extracted_lowest: 372 },
        },
      ],
      prices: [
        {
          source: "Booking.com",
          link: "https://booking.example/catbird",
          total_rate: { extracted_lowest: 365 },
        },
        {
          source: "Catbird",
          official: true,
          link: "https://catbird.example/book",
          total_rate: { extracted_lowest: 372 },
        },
        {
          source: "Expedia",
          link: "https://expedia.example/catbird",
          rate_per_night: { extracted_lowest: 199 },
        },
      ],
    });
  }
  if (p.get("engine") === "google_flights") {
    return Response.json({
      best_flights: [
        {
          flights: [leg("AUS", "DEN", "2026-11-20 13:15")],
          total_duration: 130,
          price: 164,
          departure_token: "DEP_1",
        },
      ],
    });
  }
  if (p.get("engine") === "google_hotels") {
    return Response.json({
      properties: [
        {
          name: "Catbird",
          gps_coordinates: { latitude: 39.7685, longitude: -104.9749 },
          rate_per_night: { extracted_lowest: 189 },
          total_rate: { extracted_lowest: 378 },
          overall_rating: 4.6,
          property_token: "PROP_CATBIRD",
        },
      ],
    });
  }
  return Response.json({ error: `unexpected call ${url}` }, { status: 400 });
}

const denverDates = { outbound_date: "2026-11-20", return_date: "2026-11-22" };
const denverStay = {
  location: "Denver, CO",
  check_in_date: "2026-11-20",
  check_out_date: "2026-11-22",
};

Deno.test("book fetches live SerpAPI booking options and uses the cheapest seller", async () => {
  const c = ctx();
  await runTool("extract_trip", "{}", c); // 4 people
  let booked = await runTool("book", "{}", c);
  const urls = await withSerpapi(fakeSerpapi, async () => {
    await runTool(
      "search_flights",
      JSON.stringify({ origin: "AUS", destination: "DEN", ...denverDates }),
      c,
    );
    await runTool("search_hotels", JSON.stringify(denverStay), c);
    await runTool("pin_on_map", JSON.stringify({ refs: ["flight_1", "hotel_1"] }), c);
    c.bookingConfirmed = true;
    booked = await runTool("book", JSON.stringify({ refs: ["flight_1", "hotel_1"] }), c);
  });

  assert(booked.ok, booked.summary);
  // search flights, search hotels, then: return flights, flight sellers, hotel prices
  assertEquals(urls.length, 5);
  const booking = (await c.store.getPlan("p")).trip.booking;
  const sellers = booking?.offers.map((o) => `${o.ref}:${o.seller}:${o.priceCents / 100}`);
  assertEquals(sellers, [
    "flight_1:Frontier:158",
    "flight_1:Expedia:171",
    "hotel_1:Booking.com:365",
    "hotel_1:Catbird:372",
    "hotel_1:Expedia:398", // $199/night × 2 nights
  ]);
  assertEquals(booking?.offers[0].bookingRequest?.post_data, "u=abc");
  assertEquals(booking?.offers[2].url, "https://booking.example/catbird");
  // 4 × $158 + 2 rooms × $365, cheaper than the searched $164 / $378
  assertEquals(booking?.totalCents, (4 * 158 + 2 * 365) * 100);
  assertEquals(booked.summary.split(" · ").slice(1), [
    "$1,362 total",
    "best prices: Frontier, Booking.com",
  ]);
});

Deno.test("book still confirms when the booking lookups fail", async () => {
  const c = ctx();
  await runTool("extract_trip", "{}", c);
  let booked = await runTool("book", "{}", c);
  await withSerpapi(
    (url) =>
      url.searchParams.has("departure_token") || url.searchParams.has("property_token")
        ? Response.json({ error: "Server error" }, { status: 500 })
        : fakeSerpapi(url),
    async () => {
      await runTool(
        "search_flights",
        JSON.stringify({ origin: "AUS", destination: "DEN", ...denverDates }),
        c,
      );
      await runTool("search_hotels", JSON.stringify(denverStay), c);
      await runTool("pin_on_map", JSON.stringify({ refs: ["flight_1", "hotel_1"] }), c);
      c.bookingConfirmed = true;
      booked = await runTool("book", JSON.stringify({ refs: ["flight_1", "hotel_1"] }), c);
    },
  );

  assert(booked.ok, booked.summary);
  const booking = (await c.store.getPlan("p")).trip.booking;
  assertEquals(booking?.offers, []);
  // Falls back to the searched prices.
  assertEquals(booking?.totalCents, (4 * 164 + 2 * 378) * 100);
});
