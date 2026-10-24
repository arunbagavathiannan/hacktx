import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import type { AgentStep, AgentStepStatus } from "@/mocks/types";

export type PlaybackStatus = Extract<AgentStepStatus, "running" | "done" | "failed">;

// A step as the timeline plays it. The Realtime agent_steps feed will send the same thing:
// how the tool call ended, plus a friendly line for when a tool failed and the agent
// fell back (e.g. "Couldn't reach flights, using cached results").
export type PlaybackStep = AgentStep & {
  outcome?: Extract<AgentStepStatus, "done" | "failed">; // default "done"
  fallback?: string;
};

// MOCK: the mock durations add up to ~9.5 s, which drags on stage. Play them faster here
// (the shared mocks stay as they are) so the whole run lands around 8 s.
const MOCK_SPEED = 0.6;
const START_DELAY_MS = 450; // let the screen transition land first
export const LINE_FILL_MS = 300; // connector line drawing down to the next step
export const READY_BEAT_MS = 650; // "Plan ready" lands before the See the plan button

const native = Platform.OS !== "web";

function announce(message: string) {
  if (native) AccessibilityInfo.announceForAccessibility(message);
}

export function stepSummary(step: PlaybackStep) {
  return step.outcome === "failed"
    ? `${step.label}: ${step.fallback ?? "skipped, Huddle kept going without it"}`
    : `${step.label}: done. ${step.detail}`;
}

// Plays agent steps on a timer: each one runs for its duration, then ends done or failed.
// After the last one: `ready` (the closing "Plan ready" row), then `finished` (the button).
// `instant` (reduced motion or ?demo=done) shows everything finished at once.
export function useStepPlayback(steps: PlaybackStep[], instant: boolean) {
  const [started, setStarted] = useState(instant ? steps.length : 0);
  const [ended, setEnded] = useState(instant ? steps.length : 0);
  const [ready, setReady] = useState(instant);
  const [finished, setFinished] = useState(instant);

  useEffect(() => {
    if (instant) {
      setStarted(steps.length);
      setEnded(steps.length);
      setReady(true);
      setFinished(true);
      return;
    }
    setStarted(0);
    setEnded(0);
    setReady(false);
    setFinished(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    let t = START_DELAY_MS;
    steps.forEach((step, i) => {
      at(t, () => setStarted(i + 1));
      t += Math.round(step.durationMs * MOCK_SPEED);
      at(t, () => {
        setEnded(i + 1);
        announce(stepSummary(step));
        if (native) Haptics.selectionAsync();
      });
      t += LINE_FILL_MS;
    });
    at(t, () => {
      setReady(true);
      announce("Plan ready");
      if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
    at(t + READY_BEAT_MS, () => setFinished(true));
    return () => timers.forEach(clearTimeout);
  }, [steps, instant]);

  return {
    visible: steps.slice(0, started),
    status: (i: number): PlaybackStatus => (i < ended ? (steps[i]?.outcome ?? "done") : "running"),
    ended,
    failed: steps.slice(0, ended).filter((s) => s.outcome === "failed").length,
    ready,
    finished,
  };
}
