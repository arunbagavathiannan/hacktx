import { create } from "zustand";
import {
  type BookingResult,
  bookPlan,
  type Detection,
  detectPlan,
  fetchPlanStatus,
  HUDDLE_ID,
  LIVE_ID,
  loadDestination,
  type StepRow,
  startPlan,
  watchSteps,
} from "@/lib/live";
import { brief, members } from "@/mocks";
import { setLiveDestination } from "@/mocks/destinations";
import type { ChatMessage, Preferences } from "@/mocks/types";
import { usePlan } from "./plan";

// Live mode's run (lib/live.ts): the plan id, its agent_steps as they stream in, and how it
// ended. The post-pick screens read the result through usePlan's "live" destination.

export type LivePhase = "idle" | "starting" | "running" | "ready" | "needs_input" | "failed";

// The demo group's names by Member.id, for turning chat senders into names and back.
const names = {
  ...Object.fromEntries(members.map((m) => [m.id, m.name])),
  [HUDDLE_ID]: "Huddle",
};

type State = {
  // The chat as Huddle sees it: the mock group chat plus anything typed on the chat screen.
  messages: ChatMessage[];
  planId: string | null;
  phase: LivePhase;
  steps: StepRow[];
  question: string | null; // the agent's ask_user question
  missing: string[]; // what that question is about: "destination", "dates", "budget"
  error: string | null;
  booking: BookingResult | null;
  // The picks that booking was made for, so a switch shows "Update booking".
  bookedPicks: string[] | null;
  bookingBusy: boolean; // a book call is in flight
  // Adds a message to the chat as `from` (a Member.id; defaults to you).
  addMessage: (text: string, from?: string) => void;
  // Huddle's read of the chat: Muse Spark's "is this a plan?" for the messages so far.
  detection: Detection | null;
  detecting: boolean;
  detect: () => Promise<Detection | null>;
  start: (preferences: Preferences) => Promise<string | null>;
  // Huddle asked the group something in the chat (askedAt = how many messages the chat had
  // then). Once they've talked it over, this continues the same plan with the whole chat.
  askedAt: number | null;
  // First step_index of the current run, so steps from an earlier run (e.g. before Huddle asked
  // in the chat) never count as this run finishing.
  runFrom: number;
  continuePlan: (preferences: Preferences) => Promise<void>;
  watch: (planId: string) => () => void;
  // Books the group's current picks. Same picks as last time: nothing to do.
  book: (picks: string[]) => Promise<void>;
  reset: () => void;
};

// A run is over when nothing is running and its last step is a passed verify, a question for
// the group, or an error (a failed verify means the planner is retrying).
function finished(rows: StepRow[]) {
  const last = rows.at(-1);
  if (!last || rows.some((r) => r.status === "running")) return false;
  return (
    (last.tool === "verify" && last.status === "done") ||
    last.tool === "ask_user" ||
    last.tool === "error"
  );
}

// "2026-10-24T22:08:00-05:00": the local wall-clock time with its offset, which is what the
// chat's clockTime reads (toISOString would show UTC, e.g. 4:08 AM for a 10:08 PM message).
function localIso(d = new Date()) {
  const offset = -d.getTimezoneOffset();
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const local = new Date(d.getTime() + offset * 60_000).toISOString().slice(0, 19);
  return `${local}${offset >= 0 ? "+" : "-"}${pad(offset / 60)}:${pad(offset % 60)}`;
}

// Live mode starts with an empty chat: on stage, the group's conversation is typed for real.
const startingChat: ChatMessage[] = [];

export const useLive = create<State>()((set, get) => ({
  messages: startingChat,
  planId: null,
  phase: "idle",
  steps: [],
  question: null,
  missing: [],
  askedAt: null,
  runFrom: 0,
  error: null,
  booking: null,
  bookedPicks: null,
  bookingBusy: false,

  detection: null,
  detecting: false,

  // Only the newest call's answer counts, so a slow reply can't undo a later one.
  detect: async () => {
    const asked = get().messages.length;
    if (!asked) return null;
    set({ detecting: true });
    try {
      const result = await detectPlan({ chat: get().messages, names });
      if (get().messages.length !== asked) return null;
      set({ detection: result, detecting: false });
      return result;
    } catch {
      set({ detecting: false });
      return null;
    }
  },

  addMessage: (text, from = "you") =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `typed-${s.messages.length}-${Date.now()}`,
          app: brief.sourceChat.app,
          chat: brief.sourceChat.name,
          from,
          text,
          at: localIso(),
        },
      ],
    })),

  start: async (preferences) => {
    set({
      phase: "starting",
      steps: [],
      runFrom: 0,
      error: null,
      question: null,
      booking: null,
      bookedPicks: null,
    });
    try {
      const planId = await startPlan({
        chat: get().messages,
        names,
        chatName: brief.sourceChat.name,
        sourceApp: brief.sourceChat.app,
        preferences,
      });
      set({ planId, phase: "running" });
      return planId;
    } catch (err) {
      set({ phase: "failed", error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  continuePlan: async (preferences) => {
    const planId = get().planId;
    if (!planId) return;
    const runFrom = Math.max(-1, ...get().steps.map((s) => s.step_index)) + 1;
    set({ phase: "running", question: null, missing: [], askedAt: null, error: null, runFrom });
    try {
      await startPlan({
        planId,
        chat: get().messages,
        names,
        chatName: brief.sourceChat.name,
        sourceApp: brief.sourceChat.app,
        preferences,
      });
    } catch (err) {
      set({ phase: "failed", error: err instanceof Error ? err.message : String(err) });
    }
  },

  watch: (planId) => {
    if (get().planId !== planId) set({ planId, phase: "running", steps: [] });
    return watchSteps(planId, async (rows) => {
      set({ steps: rows });
      const thisRun = rows.filter((r) => r.step_index >= get().runFrom);
      if (!finished(thisRun) || get().phase !== "running") return;
      // The last step can land a moment before the plan's status does: wait for a final one.
      let plan = await fetchPlanStatus(planId);
      for (let i = 0; i < 8 && plan?.status === "planning"; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        plan = await fetchPlanStatus(planId);
      }
      if (get().phase !== "running") return;
      if (rows.at(-1)?.tool === "error" || plan?.status === "failed") {
        set({ phase: "failed", error: rows.at(-1)?.result_summary ?? "Huddle hit a snag" });
        return;
      }
      if (plan?.status === "needs_input") {
        // Ask in the group chat, so the group can talk it over (once per question).
        const question = plan.pending_question ?? "What should we plan? Where and when?";
        const last = get().messages.at(-1);
        if (!(last?.from === HUDDLE_ID && last.text === question)) {
          get().addMessage(question, HUDDLE_ID);
        }
        set({
          phase: "needs_input",
          question,
          missing: plan.missing,
          askedAt: get().messages.length,
        });
        return;
      }
      if (plan?.status === "planning") return; // still working; a later step will finish it
      try {
        setLiveDestination(await loadDestination(planId, names));
        // A new run replaces the last one's picks with this plan's defaults.
        usePlan.setState({ destinationId: null });
        usePlan.getState().chooseDestination(LIVE_ID);
        set({ phase: "ready" });
      } catch (err) {
        set({ phase: "failed", error: err instanceof Error ? err.message : String(err) });
      }
    });
  },

  book: async (picks) => {
    const planId = get().planId;
    const same = (a: string[] | null) =>
      a !== null && a.length === picks.length && [...a].sort().join() === [...picks].sort().join();
    if (!planId || get().bookingBusy || (get().booking && same(get().bookedPicks))) return;
    set({ bookingBusy: true });
    try {
      set({ booking: await bookPlan(planId, picks), bookedPicks: picks, bookingBusy: false });
    } catch (err) {
      set({
        bookingBusy: false,
        booking: {
          ok: false,
          summary: err instanceof Error ? err.message : String(err),
          offers: [],
        },
      });
    }
  },

  reset: () =>
    set({
      messages: startingChat,
      detection: null,
      detecting: false,
      missing: [],
      askedAt: null,
      runFrom: 0,
      planId: null,
      phase: "idle",
      steps: [],
      question: null,
      error: null,
      booking: null,
      bookedPicks: null,
      bookingBusy: false,
    }),
}));
