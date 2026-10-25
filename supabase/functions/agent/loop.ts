import type { ChatModel, LlmMessage } from "../_shared/muse.ts";
import { describeCall, runTool, toolDefinitions } from "../_shared/tools/index.ts";
import { pollsDecided } from "../_shared/tools/tally_votes.ts";
import type { PlanStatus, ToolContext } from "../_shared/tools/types.ts";
import type { StepLog } from "./steps.ts";
import { verify } from "./verifier.ts";

// The planner agent: Muse Spark picks tools until the plan is ready or it needs the group,
// then the verifier checks the plan. Failures go back to the planner once, then become an
// ask_user. See "Agent design" in CLAUDE.md.

export const MAX_TOOL_CALLS = 10;

export interface AgentDeps {
  model: ChatModel;
  ctx: ToolContext;
  steps: StepLog;
  maxToolCalls?: number;
  // MOCK: fake API latency per tool so the timeline shows each step working. 0 in tests.
  mockLatencyMs?: number;
}

export interface AgentResult {
  status: PlanStatus;
  toolCalls: number;
  verified: boolean;
  message: string;
}

const SYSTEM = `You are Huddle, a trip planner for a group chat. Plan the trip the chat is
talking about by calling tools. Rules:
- Start with extract_trip. If it lists anything in "missing", call ask_user with one clear
  question and stop.
- Search flights, hotels, things to do and food, then pin_on_map the best 2-4 options per
  category, favouring what the chat asked for and staying within the budget.
- Let the group decide: create_poll for the hotel, then tally_votes.
- Never call book unless the group has tapped Book. Never invent prices or links; only use
  what the tools returned.
- You have at most ${MAX_TOOL_CALLS} tool calls. When the plan is ready, reply with a two-sentence
  summary for the group and no tool calls.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runAgent(deps: AgentDeps): Promise<AgentResult> {
  const { model, ctx, steps } = deps;
  const max = deps.maxToolCalls ?? MAX_TOOL_CALLS;
  let calls = 0;

  const transcript = ctx.chat.map((m) => `${m.sender}: ${m.text}`).join("\n");
  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Group chat (I'm ${ctx.userName}). Plan this:\n${transcript}`,
    },
  ];

  // One planning pass. Returns why it stopped.
  async function plan(): Promise<{ stop: "done" | "asked" | "limit"; text: string }> {
    while (true) {
      const reply = await model.complete({ messages, tools: toolDefinitions });
      messages.push(reply);
      if (!reply.tool_calls?.length) return { stop: "done", text: reply.content ?? "" };

      for (const call of reply.tool_calls) {
        if (calls >= max) {
          // Every tool call needs an answer, even the ones over the limit.
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: "Tool call limit reached. Wrap up now." }),
          });
          continue;
        }
        calls++;
        const { name, arguments: args } = call.function;
        const index = await steps.start(name, describeCall(name, args));
        if (deps.mockLatencyMs) await sleep(deps.mockLatencyMs);
        const result = await runTool(name, args, ctx);
        await steps.finish(index, result.ok ? "done" : "failed", result.summary);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result.data),
        });

        if (name === "ask_user" && result.ok) return { stop: "asked", text: result.summary };
      }
      if (calls >= max) return { stop: "limit", text: "" };
    }
  }

  async function ask(question: string) {
    const index = await steps.start("ask_user", "Checking with the group");
    const result = await runTool("ask_user", JSON.stringify({ question }), ctx);
    await steps.finish(index, result.ok ? "done" : "failed", result.summary);
  }

  let pass = await plan();
  if (pass.stop === "asked") {
    return { status: "needs_input", toolCalls: calls, verified: false, message: pass.text };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const index = await steps.start("verify", "Double-checking prices, dates and budget");
    if (deps.mockLatencyMs) await sleep(deps.mockLatencyMs);
    const current = await ctx.store.getPlan(ctx.planId);
    const options = await ctx.store.listOptions(ctx.planId);
    const verdict = await verify(model, ctx.chat, current.trip, options);

    if (verdict.ok) {
      const budget = current.trip.budgetPerPersonUsd;
      await steps.finish(
        index,
        "done",
        `All ${verdict.checked} options check out · ~$${verdict.perPersonUsd} each` +
          (budget ? `, under $${budget}` : ""),
      );
      // Ready only now that it's verified, and only if no poll is still waiting on votes.
      const decided = pollsDecided(options, await ctx.store.listVotes(ctx.planId));
      const ready = current.status === "planning" || (current.status === "voting" && decided);
      const summary = pass.text.trim() || undefined;
      if (ready || summary) {
        await ctx.store.updatePlan(ctx.planId, {
          ...(ready ? { status: "ready" as const } : {}),
          ...(summary ? { summary } : {}),
        });
      }
      const status = (await ctx.store.getPlan(ctx.planId)).status;
      return { status, toolCalls: calls, verified: true, message: pass.text };
    }

    const n = verdict.issues.length;
    await steps.finish(
      index,
      "failed",
      `${n} ${n === 1 ? "issue" : "issues"}: ${verdict.issues[0]}`,
    );

    if (attempt === 0 && calls < max) {
      // Back to the planner, once.
      messages.push({
        role: "user",
        content: `The verifier found problems. Fix them, then summarize again:\n- ${verdict.issues.join("\n- ")}`,
      });
      pass = await plan();
      if (pass.stop === "asked") {
        return { status: "needs_input", toolCalls: calls, verified: false, message: pass.text };
      }
    } else {
      // Still wrong: let the group decide instead of showing a plan we don't trust.
      await ask(`Quick check before I finalize: ${verdict.issues[0]} Want me to adjust?`);
      return {
        status: "needs_input",
        toolCalls: calls,
        verified: false,
        message: verdict.issues[0],
      };
    }
  }

  // Unreachable: the loop always returns on its second attempt.
  throw new Error("verifier loop exited");
}
