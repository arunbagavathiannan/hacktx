// MOCK: playback script for the "Huddle is working" timeline until the real planner agent
// streams rows from Supabase `agent_steps`. Huddle has NOT picked a destination yet: it reads
// the chat, applies the user's preferences, suggests three cities, then checks each one.
// Prices are made up but add up (flight + 2 nights split 5 ways + food stays under $400).
import type { AgentStep } from "./types";

// Two tools the planner needs that aren't in AgentStep["tool"] yet. If this flow sticks,
// add them to the union in types.ts (shared file, so not changed here).
export type TimelineTool = AgentStep["tool"] | "apply_preferences" | "suggest_destinations";

export type TimelineResult = {
  label: string; // "Denver"
  value?: string; // "$142"
  note?: string; // "Red Rocks show Sun"
};

export type TimelineStep = Omit<AgentStep, "tool"> & {
  tool: TimelineTool;
  activity: string; // shown while running: what the agent is doing right now
  results?: TimelineResult[]; // revealed under the detail line once the step is done
};

// Detail for the preferences step when onboarding was skipped (fresh web build, screenshots).
export const fallbackPreferencesDetail =
  "Live music, outdoors · mid-range stays · flights under 3h";

export const timelineSteps: TimelineStep[] = [
  {
    id: "t1",
    tool: "extract_trip",
    label: "Reading the chat",
    activity: "Reading 4 new messages in ski bums",
    detail: "5 people · Fri–Sun, Nov 13–15 · under $400 each",
    durationMs: 1500,
  },
  {
    id: "t2",
    tool: "apply_preferences",
    label: "Applying your preferences",
    activity: "Matching the trip to what you picked in onboarding",
    detail: fallbackPreferencesDetail,
    durationMs: 1200,
  },
  {
    id: "t3",
    tool: "suggest_destinations",
    label: "Finding destination ideas",
    activity: "Looking for weekend cities that fit everyone",
    detail: "3 cities fit the dates and the budget",
    results: [
      { label: "Denver", note: "Red Rocks show Sun" },
      { label: "New Orleans", note: "Frenchmen St jazz" },
      { label: "Nashville", note: "Broadway live music" },
    ],
    durationMs: 2000,
  },
  {
    id: "t4",
    tool: "search_flights",
    label: "Checking flights from AUS",
    activity: "Google Flights · AUS → DEN, MSY, BNA",
    detail: "31 nonstop round trips · cheapest per city",
    results: [
      { label: "Denver", value: "$142", note: "Southwest · 2h 15m" },
      { label: "New Orleans", value: "$118", note: "Southwest · 1h 20m" },
      { label: "Nashville", value: "$131", note: "American · 1h 55m" },
    ],
    durationMs: 2300,
  },
  {
    id: "t5",
    tool: "search_hotels",
    label: "Checking places to stay",
    activity: "Google Hotels · rooms for 5, Nov 13–15",
    detail: "24 stays with room for 5 · split per person",
    results: [
      { label: "Denver", value: "$76 each", note: "The Crawford · 2 nights" },
      { label: "New Orleans", value: "$66 each", note: "Hotel Peter & Paul · 2 nights" },
      { label: "Nashville", value: "$82 each", note: "Noelle · 2 nights" },
    ],
    durationMs: 2000,
  },
  {
    id: "t6",
    tool: "verify",
    label: "Double-checking prices and dates",
    activity: "Verifier re-checking every price against its source",
    detail: "Prices match sources · all 3 fit $400 each",
    durationMs: 1600,
  },
];
