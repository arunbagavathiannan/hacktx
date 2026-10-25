import { create } from "zustand";
import {
  type BookingResult,
  bookPlan,
  fetchPlanStatus,
  LIVE_ID,
  loadDestination,
  type StepRow,
  startPlan,
  watchSteps,
} from "@/lib/live";
import { brief, chat, members } from "@/mocks";
import { setLiveDestination } from "@/mocks/destinations";
import type { ChatMessage, Preferences } from "@/mocks/types";
import { usePlan } from "./plan";

// Live mode's run (lib/live.ts): the plan id, its agent_steps as they stream in, and how it
// ended. The post-pick screens read the result through usePlan's "live" destination.

export type LivePhase = "idle" | "starting" | "running" | "ready" | "needs_input" | "failed";

// The demo group's names by Member.id, for turning chat senders into names and back.
const names = Object.fromEntries(members.map((m) => [m.id, m.name]));

type State = {
  // The chat as Huddle sees it: the mock group chat plus anything typed on the chat screen.
  messages: ChatMessage[];
  planId: string | null;
  phase: LivePhase;
  steps: StepRow[];
  question: string | null; // the agent's ask_user question
  error: string | null;
  booking: BookingResult | null;
  addMessage: (text: string) => void;
  start: (preferences: Preferences) => Promise<string | null>;
  // Answers Huddle's question: adds it to the chat and continues the same plan.
  reply: (text: string, preferences: Preferences) => Promise<void>;
  watch: (planId: string) => () => void;
  book: () => Promise<void>;
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

export const useLive = create<State>()((set, get) => ({
  messages: chat,
  planId: null,
  phase: "idle",
  steps: [],
  question: null,
  error: null,
  booking: null,

  addMessage: (text) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `typed-${s.messages.length}`,
          app: brief.sourceChat.app,
          chat: brief.sourceChat.name,
          from: "you",
          text,
          at: new Date().toISOString(),
        },
      ],
    })),

  start: async (preferences) => {
    set({ phase: "starting", steps: [], error: null, question: null, booking: null });
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

  reply: async (text, preferences) => {
    const planId = get().planId;
    if (!planId) return;
    get().addMessage(text);
    set({ phase: "running", question: null, error: null });
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
      if (!finished(rows) || get().phase !== "running") return;
      const plan = await fetchPlanStatus(planId);
      if (rows.at(-1)?.tool === "error" || plan?.status === "failed") {
        set({ phase: "failed", error: rows.at(-1)?.result_summary ?? "Huddle hit a snag" });
        return;
      }
      if (plan?.status === "needs_input") {
        set({ phase: "needs_input", question: plan.pending_question });
        return;
      }
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

  book: async () => {
    const planId = get().planId;
    if (!planId || get().booking) return;
    try {
      set({ booking: await bookPlan(planId) });
    } catch (err) {
      set({
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
      messages: chat,
      planId: null,
      phase: "idle",
      steps: [],
      question: null,
      error: null,
      booking: null,
    }),
}));
