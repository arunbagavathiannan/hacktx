// Runs the agent loop end to end with the scripted model and an in-memory store.
// deno test --allow-env supabase/functions/agent/

import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { demoChat } from "../_shared/mocks/demo-trip.ts";
import { scriptedMuse } from "../_shared/mocks/muse-script.ts";
import { memoryStore } from "../_shared/tools/store.ts";
import type { Plan } from "../_shared/tools/types.ts";
import { runAgent } from "./loop.ts";
import { memorySteps } from "./steps.ts";

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

Deno.test("demo run: 8 tool calls, verified, plan ready", async () => {
  const { plan, store, log, run } = setup();
  const result = await run();

  assertEquals(result.toolCalls, 8);
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
      "create_poll",
      "tally_votes",
      "verify",
    ],
  );
  assert(
    log.steps.every((s) => s.status === "done"),
    JSON.stringify(log.steps),
  );
  assertEquals(log.steps[1].input, "Searching flights AUS → DEN");
  // $164 flight + half of Catbird's $378 stay
  assertEquals(log.steps[8].result, "All 7 options check out · ~$353 each, under $500");
  assertEquals(store.options.filter((o) => o.isSelected).length, 1);
});

Deno.test("stops at 10 tool calls", async () => {
  const flights = {
    origin: "AUS",
    destination: "DEN",
    outbound_date: "2026-11-20",
    return_date: "2026-11-22",
  };
  const script = Array.from({ length: 15 }, (): [string, Record<string, unknown>] => [
    "search_flights",
    flights,
  ]);
  const { log, run } = setup(script);
  const result = await run();

  assertEquals(result.toolCalls, 10);
  assertEquals(log.steps.filter((s) => s.tool === "search_flights").length, 10);
  // Nothing was pinned, so the verifier can't pass and the agent asks instead.
  assertEquals(result.status, "needs_input");
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

Deno.test("a tallied plan that fails the verifier is never marked ready", async () => {
  const { plan, log, run } = setup([
    ["extract_trip", {}],
    // Wrong check-in date, then a full poll + tally.
    ["search_hotels", { ...stay, check_in_date: "2026-11-21" }],
    ["pin_on_map", { refs: ["hotel_1", "hotel_2"] }],
    ["create_poll", { category: "hotel", question: "Where should we stay?" }],
    ["tally_votes", { category: "hotel" }],
  ]);
  const statusAfterTally: string[] = [];
  const finish = log.finish;
  log.finish = async (index, status, result) => {
    if (log.steps[index].tool === "tally_votes") statusAfterTally.push(plan.status);
    await finish(index, status, result);
  };
  const result = await run();

  assertEquals(statusAfterTally, ["voting"]);
  assert(!result.verified);
  assertEquals(result.status, "needs_input");
  // The unverified summary isn't shown to the group.
  assert(!plan.summary?.startsWith("Denver, Nov 20–22"));
});

Deno.test("verified but a poll is still open: stays voting", async () => {
  const { plan, run } = setup([
    ["extract_trip", {}],
    ["search_hotels", stay],
    ["pin_on_map", { refs: ["hotel_1", "hotel_2"] }],
    ["create_poll", { category: "hotel", question: "Where should we stay?" }],
  ]);
  const result = await run();

  assert(result.verified);
  assertEquals(plan.status, "voting");
  assertMatch(plan.summary ?? "", /^Denver, Nov 20–22/);
});
