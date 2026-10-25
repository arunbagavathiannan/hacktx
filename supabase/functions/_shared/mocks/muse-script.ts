import type { AssistantMessage, ChatModel } from "../muse.ts";

// MOCK: stands in for Muse Spark until the API key arrives. The planner side replays the tool
// calls Muse Spark would make for the demo trip, one per turn, so the agent loop, agent_steps
// and the timeline all run for real. The verifier side passes along the code checks' verdict.

const dates = { outbound_date: "2026-11-20", return_date: "2026-11-22" };
const stay = { location: "Denver, CO", check_in_date: "2026-11-20", check_out_date: "2026-11-22" };

export const demoScript: [string, Record<string, unknown>][] = [
  ["extract_trip", {}],
  ["search_flights", { origin: "AUS", destination: "DEN", nonstop_only: true, ...dates }],
  ["search_hotels", { ...stay, adults: 2, max_price_per_night: 260 }],
  ["search_places", { kind: "activity", query: "Red Rocks and things to do", location: "Denver" }],
  ["search_places", { kind: "restaurant", query: "group dinner", location: "Denver" }],
  [
    "pin_on_map",
    {
      refs: ["flight_1", "flight_2", "hotel_1", "hotel_2", "hotel_3", "activity_1", "restaurant_1"],
    },
  ],
];

const finalMessage =
  "Denver, Nov 20–22: nonstop Frontier flights at $164 round trip, three hotels to pick from, " +
  "Red Rocks on Saturday and dinner at Tavernetta. Tap Book when everyone's in.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function scriptedMuse({
  script = demoScript,
  delayMs = 0,
}: {
  script?: [string, Record<string, unknown>][];
  // Pause per reply so the live timeline fills in at a believable pace.
  delayMs?: number;
} = {}): ChatModel {
  return {
    name: "scripted-muse (mock)",
    async complete({ messages, tools }): Promise<AssistantMessage> {
      if (delayMs) await sleep(delayMs);

      // Verifier: echo the code checks' verdict (the last user message carries it).
      if (!tools) {
        const last = messages[messages.length - 1];
        const ok = last.role === "user" && last.content.includes('"code_issues":[]');
        return { role: "assistant", content: JSON.stringify({ ok, issues: [] }) };
      }

      // Planner: the next scripted call, based on how many tools have answered so far.
      const done = messages.filter((m) => m.role === "tool").length;
      const next = script[done];
      if (!next) return { role: "assistant", content: finalMessage };
      const [name, args] = next;
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: `call_${done + 1}`,
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      };
    },
  };
}
