// Runs the demo path's tool calls in order against an in-memory store.
// deno test --allow-env supabase/functions/_shared/tools/

import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { demoChat } from "../mocks/demo-trip.ts";
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
