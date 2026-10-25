import { create } from "zustand";
import type { Preferences } from "@/mocks/types";

type State = Preferences & {
  onboarded: boolean;
  // Demo switch (Settings): Huddle only reads the chat after a message from you, so a scripted
  // group chat can be typed in full before the banner. Off = it reads after any message.
  waitForYou: boolean;
  setWaitForYou: (on: boolean) => void;
  set: (patch: Partial<Preferences>) => void;
  finishOnboarding: () => void;
  reset: () => void;
};

const empty: Preferences = { vibes: [], budget: null, food: [], maxTravel: null, home: null };

// Onboarding answers, kept in memory only so onboarding shows on every app launch
// (handy for demos). Huddle uses them to ask fewer questions later.
export const usePreferences = create<State>()((set) => ({
  ...empty,
  onboarded: false,
  waitForYou: false,
  setWaitForYou: (on) => set({ waitForYou: on }),
  set: (patch) => set(patch),
  finishOnboarding: () => set({ onboarded: true }),
  reset: () => set({ ...empty, onboarded: false }),
}));

// Preferences live in memory only (onboarding shows on every launch), so they are always
// "loaded". Kept so onboarding/settings can keep gating on it if persistence comes back.
export function usePreferencesHydrated() {
  return true;
}
