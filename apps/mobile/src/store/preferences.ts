import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Preferences } from "@/mocks/types";

type State = Preferences & {
  onboarded: boolean;
  set: (patch: Partial<Preferences>) => void;
  finishOnboarding: () => void;
  reset: () => void;
};

const empty: Preferences = { vibes: [], budget: null, food: [], maxTravel: null };

// Onboarding answers, saved on the device so Huddle asks fewer questions later.
export const usePreferences = create<State>()(
  persist(
    (set) => ({
      ...empty,
      onboarded: false,
      set: (patch) => set(patch),
      finishOnboarding: () => set({ onboarded: true }),
      reset: () => set({ ...empty, onboarded: false }),
    }),
    { name: "huddle-preferences", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// True once saved preferences have loaded from storage. Check this before reading
// `onboarded`, or a returning user gets sent back to onboarding on cold start.
export function usePreferencesHydrated() {
  const [hydrated, setHydrated] = useState(() => usePreferences.persist.hasHydrated());
  useEffect(() => {
    if (usePreferences.persist.hasHydrated()) setHydrated(true);
    return usePreferences.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
