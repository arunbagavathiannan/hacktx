import { homeCities } from "@/components/onboarding/options";
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

// Huddle's own messages in the group chat (it asks the group there when it needs input).
export const HUDDLE_ID = "huddle";

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
    // Each person's version (supabase/functions/agent/individuals.ts).
    individuals?: {
      name: string;
      budgetUsd?: number;
      travel: string;
      travelUsd?: number;
      hotelShareUsd: number;
      totalUsd: number;
      overBudgetUsd?: number;
      note?: string;
    }[];
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
  // Hotels: the price is the whole stay for one room (see offerEach for each person's share).
  category?: "flight" | "hotel" | "restaurant" | "activity";
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

// The onboarding city as the planner's home base, with its airport when it's a known one.
function homeFor(city?: string | null) {
  const name = city?.trim();
  if (!name) return undefined;
  const known = Object.entries(homeCities).find(([c]) => c.toLowerCase() === name.toLowerCase());
  return known ? { city: known[0], ...known[1] } : { city: name };
}

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
      // Where the group flies from unless the chat says otherwise (onboarding).
      home: homeFor(input.preferences.home),
      // Everyone in the group chat goes, not only whoever has spoken.
      members: Object.entries(input.names)
        .filter(([id]) => id !== HUDDLE_ID)
        .map(([, name]) => name),
    },
  });
  if (error || !data?.plan_id) throw new Error(error?.message ?? "Huddle couldn't start planning");
  return data.plan_id as string;
}

export type Detection = { isPlan: boolean; confidence: number; summary: string; source?: string };

// Asks the detector (supabase/functions/detect: Muse Spark, keyword fallback) whether the
// chat is turning into a plan. Small talk never reaches Muse; repeats are cached server-side.
export async function detectPlan(input: {
  chat: ChatMessage[];
  names: Record<string, string>;
}): Promise<Detection> {
  const { data, error } = await (await db()).functions.invoke("detect", {
    body: {
      user_name: input.names.you ?? "You",
      messages: input.chat.slice(-30).map((m) => ({
        sender: input.names[m.from] ?? m.from,
        text: m.text,
        sentAt: m.at,
      })),
    },
  });
  if (error || !data) throw new Error(error?.message ?? "Huddle couldn't read the chat");
  return data as Detection;
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
    .select("status, pending_question, trip")
    .eq("id", planId)
    .single();
  if (!data) return null;
  const row = data as Pick<PlanRow, "status" | "pending_question" | "trip">;
  // What Huddle still needs from the group: "destination", "dates", "budget".
  return { ...row, missing: row.trip?.missing ?? [] };
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
export async function bookPlan(planId: string, optionIds?: string[]): Promise<BookingResult> {
  const client = await db();
  const { data, error } = await client.functions.invoke("agent", {
    // The group's current picks (plan_options ids); without them, the agent's choices.
    body: { action: "book", plan_id: planId, option_ids: optionIds },
  });
  if (error) throw new Error(error.message);
  const result = data as { ok: boolean; summary: string };
  const saved = await savedBooking(planId);
  return { ok: result.ok, summary: result.summary, ...saved };
}

// The booking the agent saved on the plan (plans.trip.booking), with its links, if any.
async function savedBooking(planId: string) {
  const client = await db();
  const [plan, options] = await Promise.all([
    client.from("plans").select("trip").eq("id", planId).single(),
    client.from("plan_options").select("title, category, details").eq("plan_id", planId),
  ]);
  const booking = (plan.data?.trip as { booking?: Record<string, unknown> } | undefined)?.booking;
  type Row = { title: string; category: LiveOffer["category"]; details: Record<string, unknown> };
  const byRef = new Map(
    ((options.data ?? []) as Row[]).map((o) => [String(o.details.ref ?? ""), o]),
  );
  const offers: LiveOffer[] = Array.isArray(booking?.offers)
    ? (booking.offers as Record<string, unknown>[]).map((o) => ({
        item: byRef.get(String(o.ref))?.title ?? String(o.ref),
        category: byRef.get(String(o.ref))?.category,
        seller: String(o.seller ?? ""),
        priceUsd: Math.round(Number(o.priceCents ?? 0) / 100),
        url: str(o.url),
        official: o.official === true,
      }))
    : [];
  return { confirmationCode: str(booking?.confirmationCode), offers };
}

// ---- Sharing a plan ----

// Where shared plan links point. Set EXPO_PUBLIC_SHARE_BASE_URL to the hosted web build;
// otherwise the web build links to wherever it's running (localhost while developing).
export function planShareUrl(planId: string, picks: string[]): string | null {
  const base =
    process.env.EXPO_PUBLIC_SHARE_BASE_URL ??
    (typeof window !== "undefined" && window.location ? window.location.origin : null);
  if (!base) return null;
  const query = picks.length ? `?picks=${picks.map(encodeURIComponent).join(",")}` : "";
  return `${base.replace(/\/$/, "")}/trip/${planId}${query}`;
}

// Everything the shared plan page shows. Read-only: plain database reads, no agent or API
// calls, so opening a link never spends credits.
export async function loadSharedPlan(planId: string) {
  const [destination, booking] = await Promise.all([
    loadDestination(planId, { you: "You" }),
    savedBooking(planId),
  ]);
  return { destination, ...booking };
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
    .map((o): Flight => {
      // Trains, buses and driving (search_ground_transport) ride along with flights.
      const mode = str(o.details.mode);
      if (mode && mode !== "fly") {
        const minutes = num(o.details.duration_min) ?? 0;
        return {
          id: o.id,
          airline: o.title, // "Amtrak · Train", "Drive"
          depart: "",
          arrive: "",
          duration: `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`,
          stops: 0,
          pricePerPerson: Math.round((o.price_cents ?? 0) / 100),
          pickedBy: pickedBy(o.id),
          chosen: o.is_selected,
          url: o.url ?? undefined,
          source: "serpapi_flights",
          mode: mode as Flight["mode"],
          priceKnown: o.price_cents != null,
        };
      }
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
        chosen: o.is_selected,
        url: o.url ?? undefined,
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
        chosen: o.is_selected,
        url: o.url ?? undefined,
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
    airport: t.origin?.airport ?? (t.origin?.city ? "" : "AUS"),
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
    individuals: (t.individuals ?? []).map((p) => ({
      memberId: idFor(p.name),
      name: p.name === youName ? "You" : p.name,
      budget: p.budgetUsd,
      travel: p.travel,
      travelUsd: p.travelUsd,
      hotelShare: p.hotelShareUsd,
      total: p.totalUsd,
      overBy: p.overBudgetUsd,
      note: p.note,
    })),
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
