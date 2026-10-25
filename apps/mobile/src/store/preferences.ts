import { create } from "zustand";
import type { Preferences } from "@/mocks/types";

type State = Preferences & {
  onboarded: boolean;
  set: (patch: Partial<Preferences>) => void;
  finishOnboarding: () => void;
  reset: () => void;
};

const empty: Preferences = { vibes: [], budget: null, food: [], maxTravel: null };

// Onboarding answers, kept in memory only so onboarding shows on every app launch
// (handy for demos). Huddle uses them to ask fewer questions later.
export const usePreferences = create<State>()((set) => ({
  ...empty,
  onboarded: false,
  set: (patch) => set(patch),
  finishOnboarding: () => set({ onboarded: true }),
  reset: () => set({ ...empty, onboarded: false }),
}));

// Preferences live in memory now (nothing to load from storage), so they're always ready.
// Kept for onboarding and settings, which wait on it (main lost it in the #35 merge).
export function usePreferencesHydrated() {
  return true;
}
