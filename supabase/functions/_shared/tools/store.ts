import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type {
  Category,
  Option,
  Plan,
  PlanPatch,
  PlanStore,
  StoredOption,
  Trip,
  Vote,
} from "./types.ts";

interface OptionRow {
  id: string;
  category: Category;
  title: string;
  subtitle: string | null;
  price_cents: number | null;
  currency: string;
  url: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  details: Record<string, unknown>;
  is_selected: boolean;
}

function toStored(row: OptionRow): StoredOption {
  return {
    id: row.id,
    ref: String(row.details.ref ?? row.id),
    category: row.category,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    priceCents: row.price_cents ?? undefined,
    currency: "USD",
    url: row.url ?? undefined,
    imageUrl: row.image_url ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    details: row.details,
    isSelected: row.is_selected,
  };
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// Edge Functions pass a service-role client, which bypasses RLS.
export function supabaseStore(db: SupabaseClient): PlanStore {
  return {
    async getPlan(planId) {
      const { data, error } = await db
        .from("plans")
        .select("id, status, title, summary, trip, pending_question")
        .eq("id", planId)
        .single();
      check(error);
      if (!data) throw new Error(`plan ${planId} not found`);
      return {
        id: data.id,
        status: data.status,
        title: data.title,
        summary: data.summary,
        trip: { people: [], constraints: [], missing: [], ...(data.trip as Partial<Trip>) },
        pendingQuestion: data.pending_question,
      };
    },

    async updatePlan(planId, patch) {
      const row: Record<string, unknown> = {};
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.summary !== undefined) row.summary = patch.summary;
      if (patch.trip !== undefined) row.trip = patch.trip;
      if (patch.pendingQuestion !== undefined) row.pending_question = patch.pendingQuestion;
      const { error } = await db.from("plans").update(row).eq("id", planId);
      check(error);
    },

    async insertOptions(planId, options) {
      const { data, error } = await db
        .from("plan_options")
        .insert(
          options.map((o) => ({
            plan_id: planId,
            category: o.category,
            title: o.title,
            subtitle: o.subtitle ?? null,
            price_cents: o.priceCents ?? null,
            currency: o.currency,
            url: o.url ?? null,
            image_url: o.imageUrl ?? null,
            lat: o.lat ?? null,
            lng: o.lng ?? null,
            details: { ...o.details, ref: o.ref },
          })),
        )
        .select();
      check(error);
      return (data as OptionRow[]).map(toStored);
    },

    async listOptions(planId) {
      const { data, error } = await db
        .from("plan_options")
        .select()
        .eq("plan_id", planId)
        .order("created_at");
      check(error);
      return (data as OptionRow[]).map(toStored);
    },

    async insertVotes(planId, votes) {
      if (votes.length === 0) return;
      const { error } = await db.from("votes").upsert(
        votes.map((v) => ({ plan_id: planId, option_id: v.optionId, voter_name: v.voterName })),
        { onConflict: "option_id,voter_name", ignoreDuplicates: true },
      );
      check(error);
    },

    async listVotes(planId) {
      const { data, error } = await db
        .from("votes")
        .select("option_id, voter_name")
        .eq("plan_id", planId);
      check(error);
      return (data ?? []).map((v) => ({ optionId: v.option_id, voterName: v.voter_name }));
    },

    async clearOptions(planId) {
      // votes.option_id cascades, so the old votes go with their options.
      const { error } = await db.from("plan_options").delete().eq("plan_id", planId);
      check(error);
    },

    async selectOption(planId, category, optionId) {
      const cleared = await db
        .from("plan_options")
        .update({ is_selected: false })
        .eq("plan_id", planId)
        .eq("category", category);
      check(cleared.error);
      const { error } = await db
        .from("plan_options")
        .update({ is_selected: true })
        .eq("id", optionId);
      check(error);
    },
  };
}

// In-memory store for tests and local runs without a database.
export function memoryStore(plan: Plan): PlanStore & { options: StoredOption[]; votes: Vote[] } {
  const options: StoredOption[] = [];
  const votes: Vote[] = [];
  let nextId = 1;
  return {
    options,
    votes,
    getPlan: async () => structuredClone(plan),
    updatePlan: async (_planId, patch: PlanPatch) => {
      Object.assign(plan, structuredClone(patch));
    },
    insertOptions: async (_planId, added: Option[]) => {
      const stored = added.map((o) => ({ ...o, id: `opt-${nextId++}`, isSelected: false }));
      options.push(...stored);
      return stored;
    },
    listOptions: async () => [...options],
    insertVotes: async (_planId, added) => {
      for (const v of added) {
        const dup = votes.some((x) => x.optionId === v.optionId && x.voterName === v.voterName);
        if (!dup) votes.push(v);
      }
    },
    listVotes: async () => [...votes],
    clearOptions: async () => {
      options.length = 0;
      votes.length = 0;
    },
    selectOption: async (_planId, category, optionId) => {
      for (const o of options) {
        if (o.category === category) o.isSelected = o.id === optionId;
      }
    },
  };
}
