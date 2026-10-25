// Muse Spark client (Meta Model API, OpenAI-compatible chat completions with function calling).
// Base URL and model ID are from Meta's quickstart (dev.meta.ai/docs/quickstart, checked
// 2026-10-24): https://api.meta.ai/v1 and muse-spark-1.3. Tool calls follow the OpenAI shape
// (dev.meta.ai/docs/tool-calling). Set the key with
// `npx supabase secrets set MUSE_SPARK_API_KEY=...`; MUSE_SPARK_BASE_URL / MUSE_SPARK_MODEL
// override the defaults. Without a key the agent runs on scriptedMuse() (../mocks/muse-script.ts).

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type LlmMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type AssistantMessage = Extract<LlmMessage, { role: "assistant" }>;

export interface CompletionRequest {
  messages: LlmMessage[];
  // OpenAI-style tool definitions. Omitted for the detector and the verifier.
  tools?: unknown[];
}

export interface ChatModel {
  name: string;
  complete(req: CompletionRequest): Promise<AssistantMessage>;
}

// How long one Muse Spark call may take. Tools that call the model set their own limit
// above this (runTool's default is 8 s).
export const MUSE_TIMEOUT_MS = 20_000;

// The verifier and detector ask for JSON in the prompt (Meta's docs don't confirm
// response_format on chat completions), so pull the first {...} out of the reply.
export function parseJsonReply(content: string | null): Record<string, unknown> | null {
  const match = content?.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// The real client, or null when the key isn't set.
export function museSpark(): ChatModel | null {
  const apiKey = Deno.env.get("MUSE_SPARK_API_KEY");
  const baseUrl = Deno.env.get("MUSE_SPARK_BASE_URL") ?? "https://api.meta.ai/v1";
  const model = Deno.env.get("MUSE_SPARK_MODEL") ?? "muse-spark-1.3";
  if (!apiKey) return null;

  return {
    name: model,
    async complete({ messages, tools }) {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          ...(tools ? { tools, tool_choice: "auto" } : {}),
        }),
        signal: AbortSignal.timeout(MUSE_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`Muse Spark ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const body = await res.json();
      const message = body.choices?.[0]?.message;
      if (!message) throw new Error("Muse Spark returned no message");
      return {
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      };
    },
  };
}
