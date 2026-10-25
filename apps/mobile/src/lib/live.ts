import type { PlaybackStep } from "@/components/timeline/useStepPlayback";
import type {
  AgentStep,
  ChatMessage,
  DestinationSuggestion,
  Flight,
  Member,
  Place,
  PlaceCategory,
  Preferences,
  Trip,
} from "@/mocks/types";
import { colors } from "@/theme";

// Live mode: the planning screens run on the real agent (supabase/functions/agent) instead of
// the mocks. Turn it on with EXPO_PUBLIC_HUDDLE_LIVE=1 in apps/mobile/.env. Off by default, so
// the scripted demo and PR screenshots keep working without keys or API spend.
export const LIVE = process.env.EXPO_PUBLIC_HUDDLE_LIVE === "1";

// The id the live plan's destination goes by in the plan store (see mocks/destinations.ts).
export const LIVE_ID = "live";

// Loaded on first use, so the mock demo never needs Supabase env vars.
const db = async () => (await import("@/lib/supabase")).supabase;

// ---- Rows as the agent writes them (supabase/migrations/20261024214000_plans.sql) ----

export type StepRow = {
  step_index: number;
  tool: string;
  input_summary: string | null;
  status: "running" | "done" | "failed";
  result_summary: string | null;
};

type PlanRow = {
  id: string;
  status: "planning" | "needs_input" | "voting" | "ready" | "booked" | "failed";
  title: string | null;
  summary: string | null;
  chat_name: string | null;
  source_app: "whatsapp" | "instagram" | null;
  pending_question: string | null;
  trip: {
    origin?: { city: string; airport?: string; lat?: number; lng?: number };
    destination?: { city: string; airport?: string; lat?: number; lng?: number };
    startDate?: string;
    endDate?: string;
    people?: string[];
    budgetPerPersonUsd?: number;
    constraints?: string[];
    missing?: string[];
  };
};

type OptionRow = {
  id: string;
  category: "flight" | "hotel" | "restaurant" | "activity";
  title: string;
  subtitle: string | null;
  price_cents: number | null;
  url: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  details: Record<string, unknown>;
  is_selected: boolean;
};

// One place to book one part of the plan (SerpAPI booking options), cheapest first.
export type LiveOffer = {
  item: string; // what it books: "Frontier · Nonstop", "Catbird"
  seller: string;
  priceUsd: number;
  url?: string;
  official?: boolean;
};

export type BookingResult = {
  ok: boolean;
  summary: string; // "Confirmed HDL-386679 · $1,412 total"
  confirmationCode?: string;
  offers: LiveOffer[];
};

// ---- Calls ----

// Starts a plan from the chat. Returns the plan id right away; the agent keeps working in the
// background and writes agent_steps as it goes.
export async function startPlan(input: {
  planId?: string; // continue this plan (after the group answered Huddle's question)
  chat: ChatMessage[];
  names: Record<string, string>; // Member.id -> name
  chatName: string;
  sourceApp: ChatMessage["app"];
  preferences: Preferences;
}): Promise<string> {
  const { data, error } = await (await db()).functions.invoke("agent", {
    body: {
      plan_id: input.planId,
      user_name: input.names.you ?? "You",
      chat_name: input.chatName,
      source_app: input.sourceApp,
      chat: input.chat.map((m) => ({
        sender: input.names[m.from] ?? m.from,
        text: m.text,
        sentAt: m.at,
      })),
      preferences: input.preferences,
    },
  });
  if (error || !data?.plan_id) throw new Error(error?.message ?? "Huddle couldn't start planning");
  return data.plan_id as string;
}

// The timeline so far, then every change as it happens (Supabase Realtime).
export function watchSteps(planId: string, onSteps: (rows: StepRow[]) => void): () => void {
  let rows: StepRow[] = [];
  let stopped = false;
  let unsubscribe = () => {};
  const emit = () => onSteps([...rows].sort((a, b) => a.step_index - b.step_index));
  const upsert = (row: StepRow) => {
    rows = [...rows.filter((r) => r.step_index !== row.step_index), row];
    emit();
  };

  (async () => {
    const client = await db();
    if (stopped) return;
    const channel = client
      .channel(`agent_steps:${planId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_steps", filter: `plan_id=eq.${planId}` },
        (payload) => upsert(payload.new as StepRow),
      )
      .subscribe();
    unsubscribe = () => client.removeChannel(channel);
    const { data } = await client
      .from("agent_steps")
      .select("step_index, tool, input_summary, status, result_summary")
      .eq("plan_id", planId);
    for (const row of (data ?? []) as StepRow[]) upsert(row);
  })();

  return () => {
    stopped = true;
    unsubscribe();
  };
}

export async function fetchPlanStatus(planId: string) {
  const { data } = await (await db())
    .from("plans")
    .select("status, pending_question")
    .eq("id", planId)
    .single();
  return data as Pick<PlanRow, "status" | "pending_question"> | null;
}

// Everything the post-pick screens need, as one DestinationSuggestion.
export async function loadDestination(
  planId: string,
  names: Record<string, string>,
): Promise<DestinationSuggestion> {
  const client = await db();
  const [plan, options, votes] = await Promise.all([
    client.from("plans").select("*").eq("id", planId).single(),
    client.from("plan_options").select("*").eq("plan_id", planId).order("created_at"),
    client.from("votes").select("option_id, voter_name").eq("plan_id", planId),
  ]);
  if (plan.error || !plan.data) throw new Error(plan.error?.message ?? "Plan not found");
  return toDestination(
    plan.data as PlanRow,
    (options.data ?? []) as OptionRow[],
    (votes.data ?? []) as { option_id: string; voter_name: string }[],
    names,
  );
}

// The Book tap: the agent fetches live booking offers and confirms. Never takes payment.
// The offers' links are read back from the saved booking (plans.trip.booking).
export async function bookPlan(planId: string): Promise<BookingResult> {
  const client = await db();
  const { data, error } = await client.functions.invoke("agent", {
    body: { action: "book", plan_id: planId },
  });
  if (error) throw new Error(error.message);
  const result = data as { ok: boolean; summary: string };
  const [plan, options] = await Promise.all([
    client.from("plans").select("trip").eq("id", planId).single(),
    client.from("plan_options").select("title, details").eq("plan_id", planId),
  ]);
  const booking = (plan.data?.trip as { booking?: Record<string, unknown> } | undefined)?.booking;
  const titleByRef = new Map(
    ((options.data ?? []) as { title: string; details: Record<string, unknown> }[]).map((o) => [
      String(o.details.ref ?? ""),
      o.title,
    ]),
  );
  const offers = Array.isArray(booking?.offers)
    ? (booking.offers as Record<string, unknown>[]).map((o) => ({
        item: titleByRef.get(String(o.ref)) ?? String(o.ref),
        seller: String(o.seller ?? ""),
        priceUsd: Math.round(Number(o.priceCents ?? 0) / 100),
        url: str(o.url),
        official: o.official === true,
      }))
    : [];
  return {
    ok: result.ok,
    summary: result.summary,
    confirmationCode: str(booking?.confirmationCode),
    offers,
  };
}

// ---- Rows → the app's shapes ----

const KNOWN_TOOLS = new Set<AgentStep["tool"]>([
  "extract_trip",
  "search_flights",
  "search_hotels",
  "search_places",
  "pin_on_map",
  "create_poll",
  "tally_votes",
  "verify",
  "ask_user",
  "book",
]);

export function toPlaybackStep(row: StepRow): PlaybackStep {
  const tool = KNOWN_TOOLS.has(row.tool as AgentStep["tool"])
    ? (row.tool as AgentStep["tool"])
    : "verify";
  const failed = row.status === "failed";
  return {
    id: `live-${row.step_index}`,
    tool,
    label: row.input_summary ?? row.tool,
    detail: row.result_summary ?? "",
    durationMs: 0,
    outcome: failed ? "failed" : "done",
    fallback: failed ? (row.result_summary ?? undefined) : undefined,
  };
}

const AVATAR_COLORS = ["#FFB547", "#7FD1B9", "#9BB4FF", "#F49AC1", "#C9A7FF", "#8FD694"];

const memberId = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

// "1:15 PM" from "Fri 1:15 PM → 2:25 PM · 2h 10m"
function flightTimes(subtitle: string | null) {
  const [times = "", duration = ""] = (subtitle ?? "").split(" · ");
  const [depart = "", arrive = ""] = times.split(" → ");
  return { depart, arrive, duration };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

// "…, Nashville, TN 37203" → "TN"
function regionFrom(options: OptionRow[]) {
  for (const o of options) {
    const m = str(o.details.address)?.match(/,\s*([A-Z]{2})\s+\d{5}/);
    if (m) return m[1];
  }
  return "";
}

function dateLabel(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

const CATEGORY: Record<Exclude<OptionRow["category"], "flight">, PlaceCategory> = {
  hotel: "hotel",
  restaurant: "food",
  activity: "activity",
};

export function toDestination(
  plan: PlanRow,
  options: OptionRow[],
  votes: { option_id: string; voter_name: string }[],
  names: Record<string, string>,
): DestinationSuggestion {
  const t = plan.trip ?? {};
  const youName = names.you ?? "You";
  const people = t.people?.length ? t.people : [youName];
  const members: Member[] = people.map((name, i) =>
    name === youName
      ? { id: "you", name: "You", color: colors.accent, isYou: true }
      : { id: memberId(name), name, color: AVATAR_COLORS[i % AVATAR_COLORS.length] },
  );
  const idFor = (voter: string) => (voter === youName ? "you" : memberId(voter));
  const pickedBy = (optionId: string) =>
    votes.filter((v) => v.option_id === optionId).map((v) => idFor(v.voter_name));

  const flights: Flight[] = options
    .filter((o) => o.category === "flight")
    .map((o) => {
      const { depart, arrive, duration } = flightTimes(o.subtitle);
      return {
        id: o.id,
        airline: o.title.split(" · ")[0] ?? o.title,
        depart,
        arrive,
        duration,
        stops: num(o.details.stops) ?? 0,
        pricePerPerson: Math.round((o.price_cents ?? 0) / 100),
        pickedBy: pickedBy(o.id),
        source: "serpapi_flights",
      };
    });

  const places: Place[] = options
    .filter((o) => o.category !== "flight" && o.lat != null && o.lng != null)
    .map((o) => {
      const category = CATEGORY[o.category as keyof typeof CATEGORY];
      const nightly = num(o.details.rate_per_night);
      return {
        id: o.id,
        name: o.title,
        category,
        lat: o.lat as number,
        lng: o.lng as number,
        rating: num(o.details.overall_rating) ?? num(o.details.rating) ?? 0,
        reviews: num(o.details.reviews) ?? num(o.details.user_rating_count) ?? 0,
        price: nightly ? `$${nightly}/night` : (str(o.details.price) ?? ""),
        nightlyRate: nightly,
        sleepsPerRoom: category === "hotel" ? 2 : undefined,
        address: str(o.details.address) ?? "",
        blurb: str(o.details.description) ?? o.subtitle ?? "",
        distanceLabel: "",
        pickedBy: pickedBy(o.id),
        source: category === "hotel" ? "serpapi_hotels" : "google_places",
      };
    });

  const dest = t.destination;
  const first = places[0];
  const lat = dest?.lat ?? first?.lat ?? 0;
  const lng = dest?.lng ?? first?.lng ?? 0;
  const city = dest?.city ?? "Your trip";
  const region = regionFrom(options);
  const start = t.startDate ?? new Date().toISOString().slice(0, 10);
  const end = t.endDate ?? start;
  const origin = {
    city: t.origin?.city ?? "Austin",
    airport: t.origin?.airport ?? "AUS",
    lat: t.origin?.lat ?? 30.1975,
    lng: t.origin?.lng ?? -97.6664,
  };
  const why = t.constraints?.length ? t.constraints.join(" · ") : (plan.summary ?? "");

  const trip: Trip = {
    id: plan.id,
    title: plan.title ?? `${city} trip`,
    destination: { city, region, lat, lng },
    origin,
    stops: [{ city, region, lat, lng, airport: dest?.airport, arrive: start, depart: end }],
    legs: [
      { from: origin.city, to: city, mode: "fly", flightIds: flights.map((f) => f.id) },
      { from: city, to: origin.city, mode: "fly" },
    ],
    dates: { start, end, label: dateLabel(start, end) },
    budgetPerPerson: t.budgetPerPersonUsd ?? 0,
    members,
    sourceChat: { app: plan.source_app ?? "whatsapp", name: plan.chat_name ?? "Group chat" },
    why,
  };

  const fastest = [...flights].sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];
  const headline =
    places.find((p) => p.category === "activity") ?? places.find((p) => p.category !== "hotel");

  return {
    id: LIVE_ID,
    city,
    region,
    airport: dest?.airport ?? "",
    lat,
    lng,
    match: 100,
    why,
    flightTime: fastest?.duration ?? "",
    votes: [],
    headlinePlaceId: headline?.id ?? first?.id ?? "",
    trip,
    flights,
    places,
  };
}
