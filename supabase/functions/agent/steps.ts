import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type StepStatus = "running" | "done" | "failed";

export interface Step {
  index: number;
  tool: string;
  input: string;
  status: StepStatus;
  result?: string;
}

// Writes the "Huddle is working" timeline: one agent_steps row per tool call. The app
// streams these with Realtime, so a step is written as running before it starts.
export interface StepLog {
  start(tool: string, input: string): Promise<number>;
  finish(index: number, status: Exclude<StepStatus, "running">, result: string): Promise<void>;
}

export function supabaseSteps(db: SupabaseClient, planId: string): StepLog {
  let next: number | undefined;

  // Continue after earlier runs of this plan (e.g. after the group answered ask_user).
  async function firstFreeIndex() {
    const { data } = await db
      .from("agent_steps")
      .select("step_index")
      .eq("plan_id", planId)
      .order("step_index", { ascending: false })
      .limit(1);
    return (data?.[0]?.step_index ?? -1) + 1;
  }

  return {
    async start(tool, input) {
      const index = next ?? (await firstFreeIndex());
      next = index + 1;
      const { error } = await db
        .from("agent_steps")
        .insert({ plan_id: planId, step_index: index, tool, input_summary: input });
      if (error) throw new Error(error.message);
      return index;
    },
    async finish(index, status, result) {
      const { error } = await db
        .from("agent_steps")
        .update({ status, result_summary: result, finished_at: new Date().toISOString() })
        .eq("plan_id", planId)
        .eq("step_index", index);
      if (error) throw new Error(error.message);
    },
  };
}

export function memorySteps(): StepLog & { steps: Step[] } {
  const steps: Step[] = [];
  return {
    steps,
    start: async (tool, input) => {
      steps.push({ index: steps.length, tool, input, status: "running" });
      return steps.length - 1;
    },
    finish: async (index, status, result) => {
      Object.assign(steps[index], { status, result });
    },
  };
}
