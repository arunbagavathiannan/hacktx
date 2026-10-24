import { create } from "zustand";
import { flights, places } from "@/mocks";

type State = {
  answers: Record<string, string>; // Clarification.id -> chosen option
  picks: string[]; // Place.id / Flight.id the user added to the plan
  answer: (clarificationId: string, option: string) => void;
  togglePick: (id: string) => void;
  reset: () => void;
};

// Defaults: the most-picked flight and hotel, so the plan is never empty in the demo.
const defaultPicks = ["f1", "h1", "a1"].filter(
  (id) => flights.some((f) => f.id === id) || places.some((p) => p.id === id),
);

export const usePlan = create<State>()((set) => ({
  answers: {},
  picks: defaultPicks,
  answer: (clarificationId, option) =>
    set((s) => ({ answers: { ...s.answers, [clarificationId]: option } })),
  togglePick: (id) =>
    set((s) => ({
      picks: s.picks.includes(id) ? s.picks.filter((p) => p !== id) : [...s.picks, id],
    })),
  reset: () => set({ answers: {}, picks: defaultPicks }),
}));
