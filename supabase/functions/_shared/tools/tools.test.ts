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

Deno.test("demo path: extract → search → pin → book", async () => {
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

  const hotel = store.options.find((o) => o.category === "hotel") ?? store.options[0];

  // Guardrail: no booking until the user taps Book.
  const early = await call("book", { refs: ["flight_1", hotel.ref] });
  assert(!early.ok);
  assertEquals(plan.status, "planning");

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
  assertEquals(plan.trip.missing, ["dates", "budget"]); // -5 isn't a budget
  assertEquals(res.summary, "Chicago · 4 people · dates TBD");
});

Deno.test("extract_trip with no destination asks instead of guessing Denver", async () => {
  const { plan, ctx, call } = setup();
  ctx.model = extractor('{"destination":null,"people":["Sam"],"missing":[]}');
  const res = await call("extract_trip");

  assert(res.ok, res.summary);
  assertEquals(plan.trip.destination, undefined);
  assertEquals(plan.trip.missing.sort(), ["budget", "dates", "destination"]);
  assertEquals(plan.title, "New trip");
});

Deno.test("extract_trip retries a quick Muse Spark failure once, then reports it", async () => {
  const { plan, ctx, call } = setup();
  const model = extractor(new Error("503"));
  ctx.model = model;
  const res = await call("extract_trip");

  assert(!res.ok);
  assertEquals(model.calls, 2); // one retry, never more
  assertEquals(res.summary, "Couldn't read the chat right now. Ask the group where and when.");
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

Deno.test("clearOptions empties a plan's options and votes for a clean re-run", async () => {
  const { store, call } = setup();
  await call("extract_trip");
  await call("search_hotels", stay);
  await call("pin_on_map", { refs: ["hotel_1", "hotel_2"] });
  await store.insertVotes("plan-1", [{ optionId: store.options[0].id, voterName: "Sam" }]);
  assert(store.options.length > 0 && store.votes.length > 0);

  await store.clearOptions("plan-1");
  assertEquals(store.options.length, 0);
  assertEquals(store.votes.length, 0);
});

Deno.test("extract_trip asks for a budget only when the chat has none", async () => {
  const noBudget = setup();
  noBudget.ctx.model = extractor(
    '{"destination":{"city":"Austin","airport":"AUS"},"startDate":"2026-12-04","endDate":"2026-12-06"}',
  );
  await noBudget.call("extract_trip");
  assertEquals(noBudget.plan.trip.missing, ["budget"]);
  assertEquals(noBudget.plan.trip.budgetPerPersonUsd, undefined);

  const withBudget = setup();
  withBudget.ctx.model = extractor(
    '{"destination":{"city":"Austin","airport":"AUS"},"startDate":"2026-12-04",' +
      '"endDate":"2026-12-06","budgetPerPersonUsd":350}',
  );
  await withBudget.call("extract_trip");
  assertEquals(withBudget.plan.trip.missing, []);
  assertEquals(withBudget.plan.trip.budgetPerPersonUsd, 350);
});

Deno.test("extract_trip reads budgets people give for themselves", async () => {
  const { plan, ctx, call } = setup();
  ctx.model = extractor(
    '{"destination":{"city":"Dallas","airport":"DFW"},"startDate":"2026-11-20",' +
      '"endDate":"2026-11-22","budgets":{"Jordan":400,"Priya":"lots","Sam":650}}',
  );
  await call("extract_trip");
  assertEquals(plan.trip.budgets, { Jordan: 400, Sam: 650 }); // "lots" isn't a number
  // No group-wide budget, so the plan aims at the highest personal one, and nothing is asked.
  assertEquals(plan.trip.budgetPerPersonUsd, 650);
  assertEquals(plan.trip.missing, []);
});

Deno.test("book: same picks reuse the booking, switched picks book again", async () => {
  const { plan, ctx, call } = setup();
  await call("extract_trip");
  await call("search_hotels", stay);
  await call("pin_on_map", { refs: ["hotel_1", "hotel_2"] });
  ctx.bookingConfirmed = true;

  await call("book", { refs: ["hotel_1"] });
  const first = plan.trip.booking?.confirmationCode;
  const again = await call("book", { refs: ["hotel_1"] });
  assert(again.summary.startsWith(`Already confirmed ${first}`));

  // The group switched hotels: a new booking for the new pick.
  const switched = await call("book", { refs: ["hotel_2"] });
  assert(switched.ok, switched.summary);
  assert(!switched.summary.startsWith("Already"));
  assertEquals(plan.trip.booking?.refs, ["hotel_2"]);
  assert(plan.trip.booking?.confirmationCode !== first);
});

Deno.test("extract_trip never counts Huddle as one of the people going", async () => {
  const { plan, ctx, call } = setup();
  ctx.chat = [
    { sender: "Sam", text: "paris??", sentAt: "2026-10-25T18:00:00Z" },
    { sender: "Huddle", text: "Where to, and what's the budget?", sentAt: "2026-10-25T18:01:00Z" },
    { sender: "Maya", text: "paris, 800 each", sentAt: "2026-10-25T18:02:00Z" },
  ];
  ctx.model = extractor(
    '{"destination":{"city":"Paris","airport":"CDG"},"startDate":"2026-12-04",' +
      '"endDate":"2026-12-06","people":["Sam","Maya","Huddle"],"budgetPerPersonUsd":800}',
  );
  await call("extract_trip");
  assertEquals(plan.trip.people, ["Sidd", "Sam", "Maya"]);
});

Deno.test("extract_trip doesn't retry a timeout", async () => {
  const { ctx, call } = setup();
  const timeout = new Error("Signal timed out.");
  timeout.name = "TimeoutError";
  const model = extractor(timeout);
  ctx.model = model;
  const res = await call("extract_trip");
  assert(!res.ok);
  assertEquals(model.calls, 1);
});

Deno.test("a floated budget is kept, and the group is asked to lock it in", async () => {
  const floated = setup();
  floated.ctx.model = extractor(
    '{"destination":{"city":"Paris","airport":"CDG"},"startDate":"2026-12-04",' +
      '"endDate":"2026-12-06","budgetPerPersonUsd":800,"budgetSettled":false}',
  );
  await floated.call("extract_trip");
  assertEquals(floated.plan.trip.budgetPerPersonUsd, 800);
  assertEquals(floated.plan.trip.missing, ["budget"]);

  const settled = setup();
  settled.ctx.model = extractor(
    '{"destination":{"city":"Paris","airport":"CDG"},"startDate":"2026-12-04",' +
      '"endDate":"2026-12-06","budgetPerPersonUsd":800,"budgetSettled":true}',
  );
  await settled.call("extract_trip");
  assertEquals(settled.plan.trip.missing, []);
});
