import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { AgentStep, AgentStepStatus } from "@/mocks/types";

export type PlaybackStatus = Extract<AgentStepStatus, "running" | "done">;

const START_DELAY_MS = 450; // let the screen transition land first
export const LINE_FILL_MS = 380; // connector line drawing down to the next step

// MOCK: plays agent steps on a timer. Later the same shape comes from the agent_steps table
// over Supabase Realtime. `instant` (reduced motion or ?demo=done) shows everything finished.
export function useStepPlayback(steps: AgentStep[], instant: boolean) {
  const [started, setStarted] = useState(instant ? steps.length : 0);
  const [done, setDone] = useState(instant ? steps.length : 0);

  useEffect(() => {
    if (instant) {
      setStarted(steps.length);
      setDone(steps.length);
      return;
    }
    setStarted(0);
    setDone(0);

    const native = Platform.OS !== "web";
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = START_DELAY_MS;
    steps.forEach((step, i) => {
      timers.push(setTimeout(() => setStarted(i + 1), t));
      t += step.durationMs;
      timers.push(
        setTimeout(() => {
          setDone(i + 1);
          if (!native) return;
          if (i === steps.length - 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Haptics.selectionAsync();
          }
        }, t),
      );
      t += LINE_FILL_MS;
    });
    return () => timers.forEach(clearTimeout);
  }, [steps, instant]);

  return {
    visible: steps.slice(0, started),
    status: (i: number): PlaybackStatus => (i < done ? "done" : "running"),
    done,
    finished: done >= steps.length,
  };
}
