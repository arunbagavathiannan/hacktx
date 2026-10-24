import { useEffect, useState } from "react";
import type { TimelineStep } from "@/mocks/timeline";

export type StepStatus = "pending" | "running" | "done";

// MOCK: plays the scripted steps one after another. The real version subscribes to
// Supabase `agent_steps` and derives the same `active` index from each row's status.
// `startAt` skips ahead: steps before it start out done (dev-only, for screenshots).
export function useTimelinePlayback(steps: TimelineStep[], startAt = 0, startDelayMs = 700) {
  // -1 = not started, steps.length = finished
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = startDelayMs;
    timers.push(setTimeout(() => setActive(startAt), startAt > 0 ? 0 : at));
    if (startAt > 0) at = 0;
    steps.forEach((step, i) => {
      if (i < startAt) return;
      at += step.durationMs;
      timers.push(setTimeout(() => setActive(i + 1), at));
    });
    return () => timers.forEach(clearTimeout);
  }, [steps, startAt, startDelayMs]);

  const statusOf = (i: number): StepStatus =>
    i < active ? "done" : i === active ? "running" : "pending";

  return {
    active,
    statusOf,
    doneCount: Math.max(0, Math.min(active, steps.length)),
    finished: active >= steps.length,
  };
}
