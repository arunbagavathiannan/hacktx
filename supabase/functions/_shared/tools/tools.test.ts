// Runs the demo path's tool calls in order against an in-memory store.
// deno test --allow-env supabase/functions/_shared/tools/

import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { FakeTime } from "jsr:@std/testing@1/time";
import { demoChat } from "../mocks/demo-trip.ts";
import { ENGINE_TIMEOUT_MS } from "../serpapi.ts";
import { runTool } from "./index.ts";
import { memoryStore } from "./store.ts";
import type { Plan, ToolContext } from "./types.ts";

function setup() {
  const plan: Plan = {
    id: "plan-1",
    status: "planning",
    title: null,
    summary: null,
    trip: { people: [], constraints: [], missing: [] },
    pendingQuestion: null,
  };
  const store = memoryStore(plan);
  const ctx: ToolContext = {
    planId: plan.id,
    store,
    chat: demoChat,
    userName: "Sidd",
    found: new Map(),
    bookingConfirmed: false,
  };
  const call = (name: string, args: object = {}) => runTool(name, JSON.stringify(args), ctx);
  return { plan, store, ctx, call };
}

const dates = { outbound_date: "2026-11-20", return_date: "2026-11-22" };
const stay = { location: "Denver, CO", check_in_date: "2026-11-20", check_out_date: "2026-11-22" };

Deno.test("demo path: extract → search → pin → poll → tally → book", async () => {
  const { plan, store, ctx, call } = setup();

  const trip = await call("extract_trip");
  assert(trip.ok, trip.summary);
  assertEquals(plan.trip.people, ["Sidd", "Sam", "Arun", "Villy"]);
  assertEquals(plan.title, "Denver weekend");

  const flights = await call("search_flights", {
    origin: "AUS",
    destination: "DEN",
    nonstop_only: true,
    ...dates,
  });
  assert(flights.ok, flights.summary);
  assertEquals(flights.input, "Searching flights AUS → DEN");
  assertEquals(flights.summary, "Found 4 flights from $164");

  const hotels = await call("search_hotels", { ...stay, max_price_per_night: 260 });
  assert(hotels.ok, hotels.summary);
  assertEquals(hotels.summary, "Found 4 hotels from $189/night");

  const food = await call("search_places", {
    kind: "restaurant",
    query: "dinner",
    location: "Denver",
  });
  const fun = await call("search_places", {
    kind: "activity",
    query: "Red Rocks",
    location: "Denver",
  });
  assert(food.ok && fun.ok);

  const pin = await call("pin_on_map", {
    refs: ["flight_1", "flight_2", "hotel_1", "hotel_2", "hotel_3", "restaurant_1", "activity_1"],
  });
  assert(pin.ok, pin.summary);
  assertEquals(pin.summary, "Pinned 2 flights, 3 hotels, 1 restaurant, 1 activity");
  assert(store.options.every((o) => o.lat !== undefined && o.lng !== undefined));

  // Pinning again doesn't duplicate.
  await call("pin_on_map", { refs: ["hotel_1"] });
  assertEquals(store.options.length, 7);

  const poll = await call("create_poll", { category: "hotel", question: "Where should we stay?" });
  assert(poll.ok, poll.summary);
  assertEquals(plan.status, "voting");
  assertEquals(store.votes.length, 3); // Sam, Arun, Villy; Sidd votes in the app

  const tally = await call("tally_votes", { category: "hotel" });
  assert(tally.ok, tally.summary);
  assertMatch(tally.summary, /wins with 2 of 3 votes$/);
  assertEquals(store.options.filter((o) => o.category === "hotel" && o.isSelected).length, 1);
  // Not ready yet: only the agent loop marks it ready, after the verifier passes.
  assertEquals(plan.status, "voting");
  assertEquals((tally.data as { all_polls_decided: boolean }).all_polls_decided, true);

  const hotel = store.options.find((o) => o.isSelected) ?? store.options[0];

  // Guardrail: no booking until the user taps Book.
  const early = await call("book", { refs: ["flight_1", hotel.ref] });
  assert(!early.ok);
  assertEquals(plan.status, "voting");

  ctx.bookingConfirmed = true;
  const booked = await call("book", { refs: ["flight_1", hotel.ref] });
  assert(booked.ok, booked.summary);
  assertEquals(plan.status, "booked");
  assertMatch(plan.trip.booking?.confirmationCode ?? "", /^HDL-[0-9A-F]{6}$/);
  // 4 people × $164 flight + 2 rooms × the hotel's 2-night total
  assertEquals(plan.trip.booking?.totalCents, 4 * 16400 + 2 * (hotel.priceCents ?? 0));
});

Deno.test("ask_user parks the plan with a question", async () => {
  const { plan, call } = setup();
  const res = await call("ask_user", { question: "Nov 13 or Nov 20?" });
  assert(res.ok);
  assertEquals(plan.status, "needs_input");
  assertEquals(plan.pendingQuestion, "Nov 13 or Nov 20?");
});

Deno.test("bad calls come back as friendly failures, not crashes", async () => {
  const { call } = setup();
  const cases = [
    await call("search_flights", { origin: "AUS", destination: "JFK", ...dates }),
    await call("search_hotels", { ...stay, location: "Paris" }),
    await call("search_hotels", { ...stay, max_price_per_night: 50 }),
    await call("search_flights", { origin: "AUS" }),
    await call("pin_on_map", { refs: ["hotel_9"] }),
    await call("create_poll", { category: "hotel", question: "?" }),
    await call("tally_votes", { category: "flight" }),
    await call("not_a_tool"),
  ];
  for (const res of cases) {
    assert(!res.ok, `expected failure: ${res.summary}`);
    assert(res.summary.length > 0);
  }
});

// A stand-in for Muse Spark that answers extract_trip with `reply` (or throws).
const extractor = (reply: string | Error) => ({
  name: "stub",
  calls: 0,
  async complete() {
    this.calls++;
    if (reply instanceof Error) throw reply;
    return { role: "assistant" as const, content: reply };
  },
});

Deno.test("extract_trip reads any trip from the chat with Muse Spark", async () => {
  const { plan, ctx, call } = setup();
  ctx.chat = [
    { sender: "Maya", text: "nashville for spring break??", sentAt: "2026-10-24T18:00:00Z" },
    { sender: "Jo", text: "march 13-15, keep it under 400", sentAt: "2026-10-24T18:01:00Z" },
  ];
  ctx.home = { city: "Austin", airport: "AUS" };
  ctx.model = extractor(
    'Sure! {"origin":null,"destination":{"city":"Nashville","airport":"bna","lat":36.16,"lng":-86.78},' +
      '"startDate":"2027-03-13","endDate":"2027-03-15","people":["Maya","Jo"],' +
      '"budgetPerPersonUsd":400,"constraints":["Spring break"],"missing":[]}',
  );
  const res = await call("extract_trip");

  assert(res.ok, res.summary);
  assertEquals(res.summary, "Nashville · 3 people · Mar 13–15 · $400 each");
  assertEquals(plan.title, "Nashville weekend");
  assertEquals(plan.trip.destination?.airport, "BNA");
  assertEquals(plan.trip.origin, { city: "Austin", airport: "AUS" }); // home base
  assertEquals(plan.trip.people, ["Sidd", "Maya", "Jo"]); // owner always included
  assertEquals(plan.trip.missing, []);
});

Deno.test("extract_trip lists what the chat didn't settle, and drops bad fields", async () => {
  const { plan, ctx, call } = setup();
  ctx.model = extractor(
    '{"destination":{"city":"Chicago","airport":"ORD1"},"startDate":"next friday",' +
      '"endDate":"2027-01-10","budgetPerPersonUsd":-5,"missing":["dates","vibes"]}',
  );
  const res = await call("extract_trip");

  assert(res.ok, res.summary);
  assertEquals(plan.trip.destination?.city, "Chicago");
  assertEquals(plan.trip.destination?.airport, undefined); // not a 3-letter code
  assertEquals(plan.trip.startDate, undefined); // not a date
  assertEquals(plan.trip.budgetPerPersonUsd, undefined);
  assertEquals(plan.trip.missing, ["dates"]);
  assertEquals(res.summary, "Chicago · 4 people · dates TBD");
});

Deno.test("extract_trip with no destination asks instead of guessing Denver", async () => {
  const { plan, ctx, call } = setup();
  ctx.model = extractor('{"destination":null,"people":["Sam"],"missing":[]}');
  const res = await call("extract_trip");

  assert(res.ok, res.summary);
  assertEquals(plan.trip.destination, undefined);
  assertEquals(plan.trip.missing.sort(), ["dates", "destination"]);
  assertEquals(plan.title, "New trip");
});

Deno.test("extract_trip reports a Muse Spark failure once, no retry, no fake Denver", async () => {
  const { plan, ctx, call } = setup();
  const model = extractor(new Error("503"));
  ctx.model = model;
  const res = await call("extract_trip");

  assert(!res.ok);
  assertEquals(model.calls, 1);
  assertEquals(plan.trip.destination, undefined);
});

Deno.test("extract_trip waits for a slow Muse Spark reply (past the 8 s default)", async () => {
  using time = new FakeTime();
  const { plan, ctx, call } = setup();
  ctx.model = {
    name: "slow",
    complete: () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              role: "assistant",
              content:
                '{"destination":{"city":"Nashville","airport":"BNA"},' +
                '"startDate":"2026-12-04","endDate":"2026-12-06","people":["Maya"]}',
            }),
          12_000,
        ),
      ),
  };
  const pending = call("extract_trip");
  await time.tickAsync(12_000);
  const res = await pending;

  assert(res.ok, res.summary);
  assertEquals(plan.trip.destination?.city, "Nashville");
});

Deno.test("search_flights still gives up, just after its longer Flights limit", async () => {
  using time = new FakeTime();
  const { ctx, call } = setup();
  // A search that never answers.
  ctx.store = { ...ctx.store, getPlan: () => new Promise(() => {}) };
  const pending = call("search_flights", {
    origin: "AUS",
    destination: "DEN",
    outbound_date: "2026-11-20",
    return_date: "2026-11-22",
  });
  await time.tickAsync(ENGINE_TIMEOUT_MS.google_flights + 3_000);
  const res = await pending;

  assert(!res.ok);
  assertMatch(res.summary, /took too long/);
});

Deno.test("each search tool allows more time than its SerpAPI engine", async () => {
  const { tools } = await import("./index.ts");
  const limit = (name: string) => tools.find((t) => t.name === name)?.timeoutMs ?? 8_000;
  assert(limit("search_flights") > ENGINE_TIMEOUT_MS.google_flights);
  assert(limit("search_hotels") > ENGINE_TIMEOUT_MS.google_hotels);
  assert(limit("search_places") > ENGINE_TIMEOUT_MS.google_maps);
  // book can make two Flights lookups in a row.
  assert(limit("book") > 2 * ENGINE_TIMEOUT_MS.google_flights);
});
