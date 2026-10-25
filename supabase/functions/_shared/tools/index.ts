// The planner agent's tools. The agent loop sends `toolDefinitions` to Muse Spark and calls
// `runTool` for each tool call it gets back.

import { askUser } from "./ask_user.ts";
import { book } from "./book.ts";
import { extractTrip } from "./extract_trip.ts";
import { pinOnMap } from "./pin_on_map.ts";
import { searchFlights } from "./search_flights.ts";
import { searchGroundTransport } from "./search_ground_transport.ts";
import { searchHotels } from "./search_hotels.ts";
import { searchPlaces } from "./search_places.ts";
import { type ToolArgs, type ToolContext, ToolError, type ToolResult } from "./types.ts";

export const tools = [
  extractTrip,
  searchFlights,
  searchGroundTransport,
  searchHotels,
  searchPlaces,
  pinOnMap,
  askUser,
  book,
];

// OpenAI-compatible `tools` param for chat completions.
export const toolDefinitions = tools.map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: t.parameters },
}));

const TIMEOUT_MS = 8_000;

export interface ToolRun extends ToolResult {
  ok: boolean;
  // For agent_steps.input_summary.
  input: string;
}

// The timeline line for a tool call, before it runs ("Searching flights AUS → DEN").
export function describeCall(name: string, rawArgs: string): string {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return name;
  try {
    return tool.describe(rawArgs.trim() ? JSON.parse(rawArgs) : {});
  } catch {
    return name;
  }
}

// Runs one tool call from the model. Never throws: bad args, tool errors and timeouts come
// back as `ok: false` with a message the model can act on and the timeline can show.
export async function runTool(name: string, rawArgs: string, ctx: ToolContext): Promise<ToolRun> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return fail(name, `There is no tool called ${name}.`);
  }

  let args: ToolArgs;
  try {
    args = rawArgs.trim() ? JSON.parse(rawArgs) : {};
  } catch {
    return fail(name, `Arguments for ${name} weren't valid JSON.`);
  }
  const missing = (tool.parameters.required ?? []).filter((k) => args[k] === undefined);
  if (missing.length > 0) {
    return fail(name, `${name} needs: ${missing.join(", ")}.`);
  }

  let input = name;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    input = tool.describe(args);
    const result = await Promise.race([
      tool.run(args, ctx),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), tool.timeoutMs ?? TIMEOUT_MS);
      }),
    ]);
    return { ok: true, input, ...result };
  } catch (err) {
    if (err instanceof ToolError) return fail(input, err.message);
    console.error(`tool ${name} failed`, err);
    const reason = err instanceof Error && err.message === "timeout" ? "took too long" : "failed";
    return fail(input, `${input} ${reason}. Carry on without it.`);
  } finally {
    clearTimeout(timer);
  }
}

function fail(input: string, message: string): ToolRun {
  return { ok: false, input, summary: message, data: { error: message } };
}
