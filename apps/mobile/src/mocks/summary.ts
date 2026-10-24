// MOCK: what the planner's extract_trip step "understood" from the chat, before a destination
// is picked. Each fact cites the chat message(s) it came from (ids from mocks/trip.ts `chat`).
// Real version: the extract_trip tool returns these facts with message ids as evidence.
import { clarifications as tripClarifications } from "./trip";
import type { Clarification, Preferences } from "./types";

export type FactKind = "who" | "when" | "budget" | "from";

export type Fact = {
  kind: FactKind;
  label: string;
  value: string;
  // Chat message ids this fact came from. Empty means it came from the group itself (`note`).
  quotes: string[];
  note?: string;
};

export const facts: Fact[] = [
  {
    kind: "who",
    label: "Who",
    value: "5 people",
    quotes: [], // the screen lists the names instead
  },
  {
    kind: "when",
    label: "When",
    value: "Fri Nov 13 – Sun Nov 15",
    quotes: ["m4", "m2"],
  },
  {
    kind: "budget",
    label: "Budget",
    value: "Under $400 each",
    quotes: ["m3"],
  },
  {
    kind: "from",
    label: "Leaving from",
    value: "Austin",
    quotes: [],
    note: "Where everyone in the group lives",
  },
];

export const destinationTeaser = {
  count: 3,
  line: "Sam floated Denver. Huddle found two more that fit Fri–Sun and $400.",
};

// The fly/drive question keeps the shared id ("c1") so other screens can read the answer. The
// reason is reworded here because no destination is picked yet on this screen.
const shared = tripClarifications.find((c) => c.id === "c1");
const flyOrDrive: Clarification = {
  id: "c1",
  question: shared?.question ?? "Fly or drive?",
  options: shared?.options ?? ["Fly", "Drive", "Either"],
  reason: "Some ideas are a 13 hr drive from Austin, and nobody said how you're getting there.",
};

export const summaryClarifications: Clarification[] = [
  flyOrDrive,
  {
    id: "c2",
    question: "Rooms?",
    options: ["Split 2 rooms", "One big rental", "Either"],
    reason: "Five of you, and nobody said how you want to sleep.",
  },
];

// Longest drive Austin -> any of the destination ideas. Used to skip "Fly or drive?" when the
// user's onboarding travel limit already rules driving out.
const LONGEST_DRIVE_HOURS = 13;

// If saved preferences already answer a clarification, return the answer and why.
// Returns null when the question still needs asking.
export function answeredByPreferences(
  clarificationId: string,
  prefs: Preferences,
): { option: string; because: string } | null {
  if (clarificationId === "c1" && prefs.maxTravel) {
    const limit = prefs.maxTravel.toLowerCase();
    const hours = Number(limit.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour)/)?.[1]);
    if (limit.includes("drive") && hours > 0 && hours < LONGEST_DRIVE_HOURS) {
      return {
        option: "Fly",
        because: `Your limit is a ${prefs.maxTravel}, and some ideas are ${LONGEST_DRIVE_HOURS} hr away by car, so Huddle will look at flights.`,
      };
    }
  }
  return null;
}

// Sample saved preferences, only used by the ?demo=prefs screenshot route. Never written to
// the store, so it can't overwrite a real user's onboarding answers.
export const demoPreferences: Preferences = {
  vibes: ["Outdoorsy", "Live music"],
  budget: "$$",
  food: ["Brunch", "Street food"],
  maxTravel: "4 hr drive",
};
