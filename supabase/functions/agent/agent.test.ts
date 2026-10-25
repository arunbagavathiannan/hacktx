// Runs the agent loop end to end with the scripted model and an in-memory store.
// deno test --allow-env supabase/functions/agent/

import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { demoChat } from "../_shared/mocks/demo-trip.ts";
import { scriptedMuse } from "../_shared/mocks/muse-script.ts";
import { memoryStore } from "../_shared/tools/store.ts";
import type { Plan } from "../_shared/tools/types.ts";
import { MAX_MODEL_CALLS, runAgent } from "./loop.ts";
import { memorySteps } from "./steps.ts";
import { VERIFIER_TIMEOUT_MS, verify } from "./verifier.ts";

function setup(script?: [string, Record<string, unknown>][]) {
  const plan: Plan = {
    id: "plan-1",
    status: "planning",
    title: null,
    summary: null,
    trip: { people: [], constraints: [], missing: [] },
    pendingQuestion: null,
  };
  const store = memoryStore(plan);
  const log = memorySteps();
  const run = () =>
    runAgent({
      model: scriptedMuse({ script }),
      steps: log,
      ctx: {
        planId: plan.id,
        store,
        chat: demoChat,
        userName: "Sidd",
        found: new Map(),
        bookingConfirmed: false,
      },
    });
  return { plan, store, log, run };
}

const stay = { location: "Denver", check_in_date: "2026-11-20", check_out_date: "2026-11-22" };

Deno.test("demo run: 6 tool calls, verified, plan ready", async () => {
  const { plan, store, log, run } = setup();
  const result = await run();

  assertEquals(result.toolCalls, 6);
  assert(result.verified);
  assertEquals(result.status, "ready");
  assertEquals(plan.status, "ready");
  assertMatch(result.message, /^Denver, Nov 20–22/);
  // The model's closing summary is saved for the app.
  assertEquals(plan.summary, result.message);

  // Every step finished, in order, ending with the verifier.
  assertEquals(
    log.steps.map((s) => s.tool),
    [
      "extract_trip",
      "search_flights",
      "search_hotels",
      "search_places",
      "search_places",
      "pin_on_map",
      "verify",
    ],
  );
  assert(
    log.steps.every((s) => s.status === "done"),
    JSON.stringify(log.steps),
  );
  assertEquals(log.steps[1].input, "Searching flights AUS → DEN");
  // $164 flight + half of the cheapest hotel (Catbird, $378 for two nights)
  assertEquals(log.steps[6].result, "All 7 options check out · ~$353 each, under $500");
  // The agent picks one per category; the rest stay as alternatives to switch to.
  assertEquals(
    store.options.filter((o) => o.isSelected).map((o) => o.title),
    ["Frontier · Nonstop", "Catbird", "Red Rocks Park and Amphitheatre", "Tavernetta"],
  );
  assertEquals(store.votes.length, 0);
});

Deno.test("stops at 10 tool calls", async () => {
  // Different dates each time, so none of these are cache hits.
  const script = Array.from({ length: 15 }, (_, i): [string, Record<string, unknown>] => [
    "search_flights",
    {
      origin: "AUS",
      destination: "DEN",
      outbound_date: `2026-11-${String(i + 1).padStart(2, "0")}`,
      return_date: "2026-11-28",
    },
  ]);
  const { log, run } = setup(script);
  const result = await run();

  assertEquals(result.toolCalls, 10);
  assertEquals(log.steps.filter((s) => s.tool === "search_flights").length, 10);
  // Nothing was pinned, so the verifier can't pass and the agent asks instead.
  assertEquals(result.status, "needs_input");
});

Deno.test("a repeated identical search is answered from cache, not the API", async () => {
  const flights = {
    origin: "AUS",
    destination: "DEN",
    outbound_date: "2026-11-20",
    return_date: "2026-11-22",
  };
  const script = Array.from({ length: 5 }, (): [string, Record<string, unknown>] => [
    "search_flights",
    flights,
  ]);
  const { log, run } = setup(script);
  const result = await run();

  assertEquals(result.toolCalls, 5);
  // Only the first call actually ran.
  assertEquals(log.steps.filter((s) => s.tool === "search_flights").length, 1);
});

Deno.test("a failing tool is skipped after 2 failures instead of retried", async () => {
  // JFK has no fixture, so every one of these fails.
  const script = Array.from({ length: 6 }, (_, i): [string, Record<string, unknown>] => [
    "search_flights",
    {
      origin: "AUS",
      destination: "JFK",
      outbound_date: `2026-12-0${i + 1}`,
      return_date: "2026-12-09",
    },
  ]);
  const { log, run } = setup(script);
  await run();

  const ran = log.steps.filter((s) => s.tool === "search_flights");
  assertEquals(ran.length, 2);
  assert(ran.every((s) => s.status === "failed"));
});

Deno.test("Muse Spark calls are capped per run", async () => {
  let modelCalls = 0;
  // A model that never stops asking for a tool that doesn't exist.
  const endless = {
    name: "endless",
    complete: async (req: { tools?: unknown[] }) => {
      modelCalls++;
      if (!req.tools) return { role: "assistant" as const, content: '{"ok":true,"issues":[]}' };
      return {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: `c${modelCalls}`,
            type: "function" as const,
            function: { name: "ask_nothing", arguments: "{}" },
          },
        ],
      };
    },
  };
  const { plan } = setup();
  await runAgent({
    model: endless,
    steps: memorySteps(),
    maxToolCalls: 100,
    ctx: {
      planId: plan.id,
      store: memoryStore(plan),
      chat: demoChat,
      userName: "Sidd",
      found: new Map(),
      bookingConfirmed: false,
    },
  });

  assert(modelCalls <= MAX_MODEL_CALLS, `made ${modelCalls} model calls`);
});

Deno.test("verifier failure goes back to the planner once, then asks the group", async () => {
  const { plan, log, run } = setup([
    ["extract_trip", {}],
    // Wrong check-in date: the verifier should catch it.
    ["search_hotels", { ...stay, check_in_date: "2026-11-21" }],
    ["pin_on_map", { refs: ["hotel_1"] }],
  ]);
  const result = await run();

  assert(!result.verified);
  assertEquals(result.status, "needs_input");
  const verifies = log.steps.filter((s) => s.tool === "verify");
  assertEquals(verifies.length, 2);
  assert(verifies.every((s) => s.status === "failed"));
  assertMatch(verifies[0].result ?? "", /2026-11-21/);
  assertEquals(log.steps.at(-1)?.tool, "ask_user");
  assertMatch(plan.pendingQuestion ?? "", /^Quick check before I finalize/);
});

Deno.test("ask_user stops the run without verifying", async () => {
  const { plan, log, run } = setup([
    ["extract_trip", {}],
    ["ask_user", { question: "Nov 13 or Nov 20?" }],
    ["search_flights", {}],
  ]);
  const result = await run();

  assertEquals(result.status, "needs_input");
  assertEquals(result.toolCalls, 2);
  assertEquals(plan.pendingQuestion, "Nov 13 or Nov 20?");
  assert(!log.steps.some((s) => s.tool === "verify"));
});

Deno.test("the agent can't book on its own", async () => {
  const { plan, log, run } = setup([
    ["extract_trip", {}],
    ["search_hotels", stay],
    ["pin_on_map", { refs: ["hotel_1"] }],
    ["book", { refs: ["hotel_1"] }],
  ]);
  await run();

  const book = log.steps.find((s) => s.tool === "book");
  assertEquals(book?.status, "failed");
  assert(plan.status !== "booked");
  assertEquals(plan.trip.booking, undefined);
});

Deno.test("a plan that fails the verifier is never marked ready", async () => {
  const { plan, run } = setup([
    ["extract_trip", {}],
    // Wrong check-in date: the verifier catches it.
    ["search_hotels", { ...stay, check_in_date: "2026-11-21" }],
    ["pin_on_map", { refs: ["hotel_1", "hotel_2"] }],
  ]);
  const result = await run();

  assert(!result.verified);
  assertEquals(result.status, "needs_input");
  // The unverified summary isn't shown to the group.
  assert(!plan.summary?.startsWith("Denver, Nov 20–22"));
});

Deno.test("the agent has no poll or vote tools", async () => {
  const { toolDefinitions } = await import("../_shared/tools/index.ts");
  const names = toolDefinitions.map((t) => t.function.name);
  assert(!names.includes("create_poll") && !names.includes("tally_votes"), names.join(", "));
});

Deno.test("the verifier is told who the phone owner is", async () => {
  const { plan } = setup();
  const prompts: string[] = [];
  const model = scriptedMuse();
  await runAgent({
    model: {
      name: "spy",
      complete: (req) => {
        if (!req.tools) prompts.push(req.messages.map((m) => m.content ?? "").join("\n"));
        return model.complete(req);
      },
    },
    steps: memorySteps(),
    ctx: {
      planId: plan.id,
      store: memoryStore(plan),
      chat: demoChat,
      userName: "Sidd",
      found: new Map(),
      bookingConfirmed: false,
    },
  });

  assertEquals(prompts.length, 1);
  assertMatch(prompts[0], /"owner":"Sidd"/);
  assertMatch(prompts[0], /Don't flag the owner as missing from the chat/);
});

Deno.test("preferences reach the planner and the verifier", async () => {
  const { plan } = setup();
  const planner: string[] = [];
  const verifier: string[] = [];
  const model = scriptedMuse();
  const result = await runAgent({
    model: {
      name: "spy",
      complete: (req) => {
        const text = req.messages.map((m) => m.content ?? "").join("\n");
        (req.tools ? planner : verifier).push(text);
        return model.complete(req);
      },
    },
    steps: memorySteps(),
    ctx: {
      planId: plan.id,
      store: memoryStore(plan),
      chat: demoChat,
      userName: "Sidd",
      found: new Map(),
      bookingConfirmed: false,
      preferences: { vibes: ["Outdoorsy"], budget: "$$", food: ["Vegan"], maxTravel: null },
    },
  });

  assertMatch(planner[0], /My preferences:\nVibe: Outdoorsy/);
  assertMatch(planner[0], /Food: Vegan\. Every restaurant must work for this\./);
  assertMatch(verifier[0], /"preferences":\{"vibes":\["Outdoorsy"\]/);
  // $$ allows up to $350/night, so the demo plan still passes.
  assert(result.verified);
});

Deno.test("the verifier gets its own longer timeout and only the fields it checks", async () => {
  const { plan } = setup();
  const store = memoryStore(plan);
  await store.insertOptions(plan.id, [
    {
      ref: "hotel_1",
      category: "hotel",
      title: "Catbird",
      priceCents: 37800,
      currency: "USD",
      url: "https://example.com",
      details: {
        rate_per_night: 189,
        total_rate: 378,
        check_in_date: "2026-11-20",
        description: "Apartment-style rooms with kitchenettes in RiNo, near the breweries.",
        amenities: ["Free Wi-Fi", "Kitchenette"],
        property_token: "PROP_CATBIRD",
      },
    },
  ]);
  let request: { timeoutMs?: number; text: string } | undefined;
  await verify(
    {
      name: "spy",
      complete: (req) => {
        request = { timeoutMs: req.timeoutMs, text: req.messages.map((m) => m.content).join("\n") };
        return Promise.resolve({ role: "assistant", content: '{"ok":true,"issues":[]}' });
      },
    },
    demoChat,
    { people: ["Sidd"], constraints: [], missing: [] },
    await store.listOptions(plan.id),
    "Sidd",
  );

  assertEquals(request?.timeoutMs, VERIFIER_TIMEOUT_MS);
  assertMatch(request?.text ?? "", /"rate_per_night":189/);
  assert(!request?.text.includes("Kitchenette"), "amenities left in the prompt");
  assert(!request?.text.includes("PROP_CATBIRD"), "tokens left in the prompt");
  assert(!request?.text.includes("breweries"), "description left in the prompt");
});

Deno.test("over budget still plans: a warning on the timeline and summary, not a failure", async () => {
  const { plan, log } = setup();
  // The demo plan costs ~$353 each; a $300 budget puts it over.
  const store = memoryStore(plan);
  const result = await runAgent({
    model: scriptedMuse(),
    steps: log,
    ctx: {
      planId: plan.id,
      store: {
        ...store,
        getPlan: async (id) => {
          const p = await store.getPlan(id);
          return { ...p, trip: { ...p.trip, budgetPerPersonUsd: 300 } };
        },
      },
      chat: demoChat,
      userName: "Sidd",
      found: new Map(),
      bookingConfirmed: false,
    },
  });

  assert(result.verified);
  assertEquals(result.status, "ready");
  assertEquals(
    log.steps.at(-1)?.result,
    "All 7 options check out · ~$353 each, $53 over the $300 budget",
  );
  assertMatch(plan.summary ?? "", /Heads up: About \$353 each, \$53 over the \$300 budget\./);
});

Deno.test("the model raising the budget becomes a warning, not an issue", async () => {
  const verdict = await verify(
    {
      name: "stub",
      complete: async () => ({
        role: "assistant",
        content:
          '{"ok":false,"issues":["Flights at $372 plus a hotel exceed the $400 per-person budget"]}',
      }),
    },
    demoChat,
    { people: ["Sidd"], constraints: [], missing: [] },
    [
      {
        id: "o1",
        ref: "hotel_1",
        category: "hotel",
        title: "Catbird",
        currency: "USD",
        url: "http://catbird.example", // plain http is a working link
        isSelected: false,
        details: {},
      },
    ],
    "Sidd",
  );
  assert(verdict.ok, verdict.issues.join("; "));
  assertEquals(verdict.warnings, [
    "Flights at $372 plus a hotel exceed the $400 per-person budget",
  ]);
});
