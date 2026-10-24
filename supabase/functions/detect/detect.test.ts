// deno test supabase/functions/detect/

import { assert, assertEquals } from "jsr:@std/assert@1";
import { demoChat } from "../_shared/mocks/demo-trip.ts";
import type { ChatModel } from "../_shared/muse.ts";
import type { ChatMessage } from "../_shared/tools/types.ts";
import { detect, keywordDetect } from "./detector.ts";

const msg = (sender: string, text: string): ChatMessage => ({
  sender,
  text,
  sentAt: "2026-10-24T18:00:00Z",
});

Deno.test("the demo chat is a plan", () => {
  const d = keywordDetect(demoChat, "Sidd");
  assert(d.isPlan);
  assert(d.confidence >= 0.9, String(d.confidence));
  assertEquals(d.summary, "Denver trip with Sam, Arun & Villy");
});

Deno.test("a one-line trip message still reads as a plan", () => {
  const d = keywordDetect([msg("Sam", "we should go to Austin next month")]);
  assert(d.isPlan, String(d.confidence));
  assertEquals(d.summary, "Austin trip with Sam");
});

Deno.test("small talk and passing mentions are not plans", () => {
  for (const chat of [
    [msg("Sam", "lol did you see that"), msg("Arun", "💀💀")],
    [msg("Villy", "my cousin lives in Denver")],
    [msg("Sam", "this hotel wifi is so bad")],
  ]) {
    const d = keywordDetect(chat);
    assert(!d.isPlan, `${chat.map((m) => m.text).join(" / ")} → ${d.confidence}`);
    assertEquals(d.summary, "");
  }
});

Deno.test("no messages → not a plan", async () => {
  const d = await detect([], null);
  assertEquals(d.isPlan, false);
  assertEquals(d.confidence, 0);
});

const modelReplying = (content: string): ChatModel => ({
  name: "test",
  complete: async () => ({ role: "assistant", content }),
});

Deno.test("uses Muse Spark's answer when it's well formed", async () => {
  const d = await detect(
    demoChat,
    modelReplying('{"isPlan":true,"confidence":0.97,"summary":"Denver with Sam"}'),
  );
  assertEquals(d, { isPlan: true, confidence: 0.97, summary: "Denver with Sam", source: "muse" });
});

Deno.test("falls back to keywords when the model fails or rambles", async () => {
  const broken: ChatModel = {
    name: "down",
    complete: () => Promise.reject(new Error("503")),
  };
  for (const model of [broken, modelReplying("Sure! It looks like a trip.")]) {
    const d = await detect(demoChat, model, "Sidd");
    assertEquals(d.source, "keywords");
    assert(d.isPlan);
  }
});
