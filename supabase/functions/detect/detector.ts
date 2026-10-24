import type { ChatModel } from "../_shared/muse.ts";
import type { ChatMessage } from "../_shared/tools/types.ts";

// Detector: decides whether a batch of chat messages is turning into a plan.
// One cheap Muse Spark call, no tools. Falls back to keyword scoring when the model isn't
// configured or fails, so the heads-up notification still works on stage.

export interface Detection {
  isPlan: boolean;
  confidence: number;
  // Short line for the notification: "Denver trip with Sam, Arun & Villy".
  summary: string;
}

export const PLAN_THRESHOLD = 0.6;

const CITIES = [
  "Austin",
  "Dallas",
  "Houston",
  "San Antonio",
  "Denver",
  "Nashville",
  "Chicago",
  "New York",
  "NYC",
  "Miami",
  "New Orleans",
  "Los Angeles",
  "LA",
  "San Francisco",
  "Seattle",
  "Portland",
  "Las Vegas",
  "Vegas",
  "Atlanta",
  "Boston",
  "San Diego",
  "Cancun",
  "Mexico City",
  "Tokyo",
  "London",
  "Paris",
];

// Weighted signals. A single "trip" isn't a plan; trip + place + time is.
const SIGNALS: [RegExp, number][] = [
  [/\b(trip|travel|vacation|getaway|road ?trip|fly|flights?|hotel|airbnb|book(ing)?)\b/i, 0.3],
  [/\b(we should|let'?s|wanna|want to|down to|who'?s in|i'?m in|plan(ning)?)\b/i, 0.2],
  [
    /\b(weekend|next (week|month)|spring break|thanksgiving|christmas|(mon|tues|wednes|thurs|fri|satur|sun)day|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d|the \d{1,2}(st|nd|rd|th))\b/i,
    0.2,
  ],
  [/\$\d+|\bunder \d+|\bbudget\b|\b\d+ each\b/i, 0.1],
];

function findCity(text: string) {
  for (const city of CITIES) {
    if (new RegExp(`\\b${city}\\b`, "i").test(text)) return city === "NYC" ? "New York" : city;
  }
  return undefined;
}

function names(people: string[]) {
  if (people.length <= 1) return people.join("");
  return `${people.slice(0, -1).join(", ")} & ${people[people.length - 1]}`;
}

// MOCK: keyword scoring stands in for Muse Spark until the key arrives. It's also the
// fallback if the model call fails.
export function keywordDetect(messages: ChatMessage[], userName?: string): Detection {
  const text = messages.map((m) => m.text).join("\n");
  const city = findCity(text);

  let score = city ? 0.3 : 0;
  for (const [pattern, weight] of SIGNALS) if (pattern.test(text)) score += weight;
  const confidence = Math.round(Math.min(score, 1) * 100) / 100;

  const people = [...new Set(messages.map((m) => m.sender))].filter((p) => p !== userName);
  const isPlan = confidence >= PLAN_THRESHOLD;
  const what = city ? `${city} trip` : "A trip";
  return {
    isPlan,
    confidence,
    summary: !isPlan ? "" : people.length ? `${what} with ${names(people)}` : what,
  };
}

const SYSTEM = `You watch a group chat for plans. Decide if these messages are the group
starting to plan a trip or outing together (not just mentioning a place). Reply with JSON only:
{"isPlan": boolean, "confidence": number 0-1, "summary": "<Where> trip with <names>"}
Keep summary under 50 characters.`;

export async function detect(
  messages: ChatMessage[],
  model: ChatModel | null,
  userName?: string,
): Promise<Detection & { source: "muse" | "keywords" }> {
  if (messages.length === 0) {
    return { isPlan: false, confidence: 0, summary: "", source: "keywords" };
  }
  if (model) {
    try {
      const reply = await model.complete({
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: messages.map((m) => `${m.sender}: ${m.text}`).join("\n"),
          },
        ],
        json: true,
      });
      const parsed = JSON.parse(reply.content ?? "");
      if (typeof parsed.isPlan === "boolean" && typeof parsed.confidence === "number") {
        return {
          isPlan: parsed.isPlan,
          confidence: Math.min(Math.max(parsed.confidence, 0), 1),
          summary: String(parsed.summary ?? "").slice(0, 80),
          source: "muse",
        };
      }
    } catch (err) {
      console.error("detector model call failed, using keywords", err);
    }
  }
  return { ...keywordDetect(messages, userName), source: "keywords" };
}
