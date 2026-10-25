// Planner agent Edge Function. The app calls it when the user taps the "Plan it?" notification.
// It answers right away with the plan id (so the app can subscribe to agent_steps), then runs
// the agent in the background. See "Agent design" in CLAUDE.md.
//
// POST { chat?, user_name?, source_app?, chat_name?, plan_id? }  → 202 { plan_id, model }
// POST { action: "book", plan_id, refs? }                        → 200 { ok, summary }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { demoChat } from "../_shared/mocks/demo-trip.ts";
import { scriptedMuse } from "../_shared/mocks/muse-script.ts";
import { museSpark } from "../_shared/muse.ts";
import { runTool } from "../_shared/tools/index.ts";
import { supabaseStore } from "../_shared/tools/store.ts";
import type { ChatMessage, StoredOption, ToolContext } from "../_shared/tools/types.ts";
import { runAgent } from "./loop.ts";
import { supabaseSteps } from "./steps.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

interface Body {
  action?: "plan" | "book";
  plan_id?: string;
  chat?: ChatMessage[];
  user_name?: string;
  source_app?: "whatsapp" | "instagram";
  chat_name?: string;
  refs?: string[];
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// What the Book button books: the group's winners, plus the cheapest pinned flight and hotel
// when nobody voted on those (flights usually aren't polled).
function defaultBookingRefs(options: StoredOption[]) {
  const refs = options.filter((o) => o.isSelected).map((o) => o.ref);
  for (const category of ["flight", "hotel"] as const) {
    const pinned = options.filter((o) => o.category === category);
    if (pinned.length && !pinned.some((o) => o.isSelected)) {
      const cheapest = pinned.reduce((a, b) =>
        (b.priceCents ?? Infinity) < (a.priceCents ?? Infinity) ? b : a,
      );
      refs.push(cheapest.ref);
    }
  }
  return refs;
}

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Body must be JSON" }, 400);
  }

  // Service role: the agent writes plans, options and steps; the app only reads them.
  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const store = supabaseStore(db);
  // MOCK: the demo chat stands in when the app doesn't send messages (e.g. web build).
  const chat = body.chat?.length ? body.chat : demoChat;

  let planId = body.plan_id;
  if (!planId) {
    if (body.action === "book") return reply({ error: "plan_id is required to book" }, 400);
    const { data, error } = await db
      .from("plans")
      .insert({ source_app: body.source_app ?? null, chat_name: body.chat_name ?? null })
      .select("id")
      .single();
    if (error || !data) return reply({ error: error?.message ?? "Couldn't create plan" }, 500);
    planId = data.id as string;
  }

  const ctx: ToolContext = {
    planId,
    store,
    chat,
    userName: body.user_name ?? "You",
    found: new Map(),
    bookingConfirmed: false,
  };
  const steps = supabaseSteps(db, planId);

  if (body.action === "book") {
    // Only reached when the user taps Book: that tap is the confirmation the guardrail needs.
    const options = await store.listOptions(planId);
    const refs = body.refs?.length ? body.refs : defaultBookingRefs(options);
    const index = await steps.start("book", "Preparing the booking");
    const result = await runTool("book", JSON.stringify({ refs }), {
      ...ctx,
      bookingConfirmed: true,
    });
    await steps.finish(index, result.ok ? "done" : "failed", result.summary);
    return reply({ ok: result.ok, summary: result.summary, booking: result.data });
  }

  const real = museSpark();
  const model = real ?? scriptedMuse({ delayMs: 900 });

  const work = runAgent({ model, ctx, steps, mockLatencyMs: 600 }).catch(async (err) => {
    console.error("agent run failed", err);
    // Friendly fallback: the timeline says what happened instead of spinning forever.
    await store.updatePlan(planId, { status: "failed" }).catch(() => {});
    const index = await steps.start("error", "Planning hit a snag").catch(() => -1);
    if (index >= 0) {
      await steps
        .finish(index, "failed", "Huddle couldn't finish this plan. Try again in a minute.")
        .catch(() => {});
    }
  });

  if (typeof EdgeRuntime !== "undefined") {
    EdgeRuntime.waitUntil(work);
  } else {
    await work;
  }
  return reply({ plan_id: planId, model: model.name }, 202);
});
