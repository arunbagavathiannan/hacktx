// deno test --allow-env supabase/functions/_shared/preferences.test.ts

import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { budgetWarnings, codeChecks } from "../agent/verifier.ts";
import { demoChat } from "./mocks/demo-trip.ts";
import { describePreferences, toPreferences } from "./preferences.ts";
import { resetSerpapiBreaker } from "./serpapi.ts";
import { runTool } from "./tools/index.ts";
import { memoryStore } from "./tools/store.ts";
import type { StoredOption, ToolContext } from "./tools/types.ts";

const foodie = {
  vibes: ["Outdoorsy", "Foodie"],
  budget: "$" as const,
  food: ["Vegetarian"],
  maxTravel: "Short flight (<3h)",
};

function ctx(preferences?: unknown): ToolContext {
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
    preferences: toPreferences(preferences),
  };
}

Deno.test("toPreferences accepts the app's shape and drops junk", () => {
  assertEquals(toPreferences(foodie), foodie);
  assertEquals(
    toPreferences({
      vibes: ["Chill", 3, "", "Chill"],
      budget: "$$$$",
      food: "Vegan",
      maxTravel: 7,
    }),
    { vibes: ["Chill"], budget: null, food: [], maxTravel: null },
  );
  assertEquals(toPreferences({ vibes: [], budget: null, food: [], maxTravel: null }), undefined);
  assertEquals(toPreferences("nope"), undefined);
});

Deno.test("describePreferences: one line per preference; 'No restrictions' isn't one", () => {
  const text = describePreferences(toPreferences(foodie));
  assertMatch(text, /Vibe: Outdoorsy, Foodie/);
  assertMatch(text, /Budget: \$ \(hotels up to about \$200\/night per room\)/);
  assertMatch(text, /Food: Vegetarian\. Every restaurant must work for this\./);
  assertMatch(text, /short flights only/);
  assertEquals(
    describePreferences(toPreferences({ food: ["No restrictions"], vibes: ["Chill"] })),
    "Vibe: Chill. Favour things to do that fit.",
  );
});

Deno.test("search_hotels uses the budget tier as its cap", async () => {
  const c = ctx(foodie); // "$" → $200/night
  const res = await runTool(
    "search_hotels",
    JSON.stringify({
      location: "Denver, CO",
      check_in_date: "2026-11-20",
      check_out_date: "2026-11-22",
    }),
    c,
  );
  assert(res.ok, res.summary);
  const nightly = [...c.found.values()].map((o) => Number(o.details.rate_per_night));
  assertEquals(nightly, [189]); // only Catbird is under $200
  // An explicit cap from the model still wins.
  const c2 = ctx(foodie);
  await runTool(
    "search_hotels",
    JSON.stringify({
      location: "Denver",
      check_in_date: "2026-11-20",
      check_out_date: "2026-11-22",
      max_price_per_night: 250,
    }),
    c2,
  );
  assertEquals(c2.found.size, 4);
});

Deno.test("search_flights defaults to nonstop for 'Short flight'", async () => {
  const route = {
    origin: "AUS",
    destination: "DEN",
    outbound_date: "2026-11-20",
    return_date: "2026-11-22",
  };
  const pref = ctx(foodie);
  const none = ctx();
  await runTool("search_flights", JSON.stringify(route), pref);
  await runTool("search_flights", JSON.stringify(route), none);
  const stops = (c: ToolContext) => [...c.found.values()].map((o) => o.details.stops);
  assert(stops(pref).every((s) => s === 0));
  assert(stops(none).includes(1)); // the AA connection shows up without the preference
});

Deno.test("search_places adds dietary needs to restaurant searches", async () => {
  const c = ctx(foodie);
  const realFetch = globalThis.fetch;
  const urls: URL[] = [];
  resetSerpapiBreaker();
  Deno.env.set("SERPAPI_API_KEY", "test-key");
  globalThis.fetch = (input: string | URL | Request) => {
    urls.push(new URL(input instanceof Request ? input.url : input));
    return Promise.resolve(Response.json({ local_results: [] }));
  };
  try {
    await runTool(
      "search_places",
      JSON.stringify({ kind: "restaurant", query: "group dinner", location: "Denver" }),
      c,
    );
    await runTool(
      "search_places",
      JSON.stringify({ kind: "restaurant", query: "vegetarian tacos", location: "Denver" }),
      c,
    );
    await runTool(
      "search_places",
      JSON.stringify({ kind: "activity", query: "hikes", location: "Denver" }),
      c,
    );
  } finally {
    globalThis.fetch = realFetch;
    Deno.env.delete("SERPAPI_API_KEY");
  }
  assertEquals(
    urls.map((u) => u.searchParams.get("q")),
    [
      "group dinner Vegetarian friendly in Denver",
      "vegetarian tacos in Denver", // already says it
      "hikes in Denver", // activities aren't food
    ],
  );
});

const option = (o: Partial<StoredOption>): StoredOption => ({
  id: o.ref ?? "x",
  ref: "x",
  category: "hotel",
  title: "Hotel",
  currency: "USD",
  url: "https://example.com",
  isSelected: false,
  details: {},
  ...o,
});

Deno.test("budget tier is a warning; nonstop is still a check", () => {
  const prefs = toPreferences(foodie);
  const trip = { people: ["Sidd"], constraints: [], missing: [] };
  const pricey = option({
    ref: "hotel_1",
    title: "The Crawford",
    isSelected: true,
    details: { rate_per_night: 389 },
  });
  const cheap = option({ ref: "hotel_2", title: "Catbird", details: { rate_per_night: 189 } });
  const oneStop = option({
    ref: "flight_1",
    category: "flight",
    title: "American · 1 stop",
    details: { stops: 1 },
  });

  // Over the tier: a warning the group sees, never a blocking issue.
  assertEquals(codeChecks(trip, [pricey, cheap], prefs), []);
  assertEquals(budgetWarnings(trip, [pricey, cheap], prefs), [
    "The Crawford is $389/night, over the $ budget (~$200).",
  ]);
  assertEquals(budgetWarnings(trip, [{ ...cheap, isSelected: true }, pricey], prefs), []);
  assertEquals(budgetWarnings(trip, [{ ...pricey, isSelected: false }], prefs), [
    "Every hotel is over the $ budget (~$200/night).",
  ]);
  assertEquals(codeChecks(trip, [cheap, oneStop], prefs), [
    "American · 1 stop has a stop, but the owner wants short nonstop flights.",
  ]);
  // No preferences: none of these rules apply.
  assertEquals(codeChecks(trip, [pricey, oneStop]), []);
});
