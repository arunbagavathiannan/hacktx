// Muse Spark client (Meta Model API, OpenAI-compatible chat completions with function calling).
// The model ID and base URL come from Supabase secrets, not code: confirm them in Meta's
// developer docs, then `npx supabase secrets set MUSE_SPARK_API_KEY=... MUSE_SPARK_BASE_URL=...
// MUSE_SPARK_MODEL=...`. Until then the agent runs on scriptedMuse() (../mocks/muse-script.ts).

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
  // Ask for a JSON object reply (verifier, detector).
  json?: boolean;
}

export interface ChatModel {
  name: string;
  complete(req: CompletionRequest): Promise<AssistantMessage>;
}

const TIMEOUT_MS = 20_000;

// The real client, or null when the secrets aren't set.
export function museSpark(): ChatModel | null {
  const apiKey = Deno.env.get("MUSE_SPARK_API_KEY");
  const baseUrl = Deno.env.get("MUSE_SPARK_BASE_URL");
  const model = Deno.env.get("MUSE_SPARK_MODEL");
  if (!apiKey || !baseUrl || !model) return null;

  return {
    name: model,
    async complete({ messages, tools, json }) {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          ...(tools ? { tools, tool_choice: "auto" } : {}),
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
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
