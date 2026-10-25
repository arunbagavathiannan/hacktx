// deno test --allow-env supabase/functions/detect/

import { assert, assertEquals } from "jsr:@std/assert@1";
import { demoChat } from "../_shared/mocks/demo-trip.ts";
import type { ChatModel } from "../_shared/muse.ts";
import type { ChatMessage } from "../_shared/tools/types.ts";
import { clearDetectCache, detect, keywordDetect, MODEL_MIN_SCORE } from "./detector.ts";

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
  clearDetectCache();
  const d = await detect(
    demoChat,
    modelReplying('{"isPlan":true,"confidence":0.97,"summary":"Denver with Sam"}'),
  );
  assertEquals(d, { isPlan: true, confidence: 0.97, summary: "Denver with Sam", source: "muse" });
});

Deno.test("falls back to keywords when the model fails or rambles", async () => {
  clearDetectCache();
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

Deno.test("small talk never reaches Muse Spark", async () => {
  clearDetectCache();
  let calls = 0;
  const spy: ChatModel = {
    name: "spy",
    complete: async () => {
      calls++;
      return { role: "assistant", content: '{"isPlan":false,"confidence":1,"summary":""}' };
    },
  };
  const d = await detect([msg("Sam", "lol did you see that"), msg("Arun", "💀")], spy);
  assertEquals(calls, 0);
  assertEquals(d.isPlan, false);
});

Deno.test("the same batch twice costs one Muse Spark call", async () => {
  clearDetectCache();
  let calls = 0;
  const spy: ChatModel = {
    name: "spy",
    complete: async () => {
      calls++;
      return {
        role: "assistant",
        content: '{"isPlan":true,"confidence":0.9,"summary":"Denver trip with Sam"}',
      };
    },
  };
  const first = await detect(demoChat, spy, "Sidd");
  const second = await detect(demoChat, spy, "Sidd");
  assertEquals(calls, 1);
  assertEquals(second, first);
  // A new message is a new batch.
  await detect([...demoChat, msg("Villy", "booking flights tonight")], spy, "Sidd");
  assertEquals(calls, 2);
});

Deno.test("low bar: wishful travel talk is a trip to suggest", () => {
  // The chat from a real test: nobody has agreed to anything, but there's a wish and a place.
  const wishful = keywordDetect([
    msg("Sam", "Yo I'm so bored right now"),
    msg("Sam", "And I'm so burned out from work"),
    msg("Maya", "Me too I really need a vacation right now"),
    msg("Maya", "I've always wanted to go to Paris"),
  ]);
  assert(wishful.isPlan, String(wishful.confidence));
  assertEquals(wishful.summary, "Paris trip with Sam & Maya");

  // A wish with no place yet still reaches Muse Spark (above the pre-check's bar).
  const noPlace = keywordDetect([msg("Sam", "im so burned out, i need a break")]);
  assert(noPlace.confidence >= MODEL_MIN_SCORE, String(noPlace.confidence));

  // Small talk still doesn't.
  assert(keywordDetect([msg("Sam", "yo im so bored lol")]).confidence < MODEL_MIN_SCORE);
});

Deno.test("any place after 'go to' counts, not just known cities", () => {
  // The chat from a real test that Huddle missed.
  const japan = keywordDetect([
    msg("Sam", "We should go to Japan"),
    msg("Maya", "I agree"),
    msg("Jordan", "Lets plan it"),
  ]);
  assert(japan.isPlan, String(japan.confidence));
  assertEquals(japan.summary, "Japan trip with Sam, Maya & Jordan");

  // Lowercase works too, and a trailing word isn't part of the place.
  assertEquals(
    keywordDetect([msg("Sam", "lets go to iceland rn")]).summary,
    "Iceland trip with Sam",
  );
  assertEquals(
    keywordDetect([msg("Sam", "we should fly to Costa Rica this summer")]).summary,
    "Costa Rica trip with Sam",
  );

  // Not places: errands and everyday stuff.
  assert(!keywordDetect([msg("Sam", "i need to go to bed"), msg("Maya", "same lol")]).isPlan);
  assert(!keywordDetect([msg("Sam", "gotta go to the store")]).isPlan);
});
