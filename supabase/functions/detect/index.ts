// Detector Edge Function. The app's notification listener sends recent messages from a chat;
// this answers whether it looks like a plan, so the app can show the "Plan it?" heads-up.
// No tools, no database writes. See "Agent design" in CLAUDE.md.
//
// POST { messages: [{ sender, text, sentAt }], user_name? } → 200 { isPlan, confidence, summary, source }

import { museSpark } from "../_shared/muse.ts";
import type { ChatMessage } from "../_shared/tools/types.ts";
import { detect } from "./detector.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

// Only the most recent messages are sent to the model.
const MAX_MESSAGES = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  let body: { messages?: ChatMessage[]; user_name?: string };
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Body must be JSON" }, 400);
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => typeof m?.text === "string" && typeof m?.sender === "string")
    .slice(-MAX_MESSAGES);

  // `source` says whether Muse Spark answered or the keyword fallback did. Add ?debug=1 to
  // also see why the model was skipped.
  const { modelError, ...result } = await detect(messages, museSpark(), body.user_name);
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  return reply(debug ? { ...result, modelError } : result);
});
