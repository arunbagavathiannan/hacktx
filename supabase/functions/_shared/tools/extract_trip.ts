import { demoTrip } from "../mocks/demo-trip.ts";
import { parseJsonReply } from "../muse.ts";
import { defineTool } from "./helpers.ts";
import { type Place, type ToolContext, ToolError, type Trip } from "./types.ts";

const SYSTEM = `You read a group chat and pull out the trip the group is planning.
Reply with JSON only, no prose:
{"origin": {"city": "...", "airport": "IATA"} | null,
 "destination": {"city": "...", "airport": "IATA or null", "lat": number, "lng": number} | null,
 "startDate": "YYYY-MM-DD" | null, "endDate": "YYYY-MM-DD" | null,
 "people": ["names going"], "budgetPerPersonUsd": number | null,
 "constraints": ["short things the group asked for"],
 "missing": ["what the chat didn't settle, from: destination, dates"]}
Turn relative dates ("next weekend", "the 20th") into real dates using today's date. Only use
what the chat says; use null when it doesn't say. Use the home base as the origin unless the
chat names another one.`;

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function place(v: unknown): Place | undefined {
  if (!v || typeof v !== "object") return undefined;
  const p = v as Record<string, unknown>;
  const city = str(p.city);
  if (!city) return undefined;
  const airport = str(p.airport)?.toUpperCase();
  return {
    city,
    airport: airport && /^[A-Z]{3}$/.test(airport) ? airport : undefined,
    lat: num(p.lat),
    lng: num(p.lng),
  };
}

// Model JSON → a Trip we can trust: bad fields are dropped, and anything the plan can't go
// ahead without is listed in `missing` so the agent asks the group.
export function toTrip(raw: Record<string, unknown>, ctx: ToolContext): Trip {
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.map(str).filter((s): s is string => Boolean(s)) : [];
  const senders = ctx.chat.map((m) => m.sender);
  const startDate = isDate(raw.startDate) ? raw.startDate : undefined;
  const endDate =
    isDate(raw.endDate) && (!startDate || raw.endDate >= startDate) ? raw.endDate : undefined;
  const destination = place(raw.destination);
  const budget = num(raw.budgetPerPersonUsd);

  const missing = new Set(strings(raw.missing).filter((m) => m === "destination" || m === "dates"));
  if (!destination) missing.add("destination");
  else missing.delete("destination");
  if (!startDate || !endDate) missing.add("dates");
  else missing.delete("dates");

  return {
    origin: place(raw.origin) ?? ctx.home,
    destination,
    startDate,
    endDate,
    // The phone owner is always going: their own messages never show up in notifications.
    people: [...new Set([ctx.userName, ...strings(raw.people), ...senders])],
    budgetPerPersonUsd: budget && budget > 0 ? budget : undefined,
    constraints: strings(raw.constraints).slice(0, 8),
    missing: [...missing],
  };
}

// "2026-11-20", "2026-11-22" → "Nov 20–22"; across months → "Nov 28 – Dec 2".
export function dateRange(start?: string, end?: string) {
  if (!start || !end) return "dates TBD";
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
  return start.slice(0, 7) === end.slice(0, 7)
    ? `${fmt(start, { month: "short", day: "numeric" })}–${fmt(end, { day: "numeric" })}`
    : `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric" })}`;
}

export const extractTrip = defineTool<Record<string, never>>({
  name: "extract_trip",
  description:
    "Read the group chat and pull out who is going, origin, destination, dates, budget per " +
    "person and constraints. Call this first, once. Lists anything the chat didn't settle in " +
    "`missing`; if it isn't empty, ask the group with ask_user.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  describe: () => "Reading the chat",
  async run(_args, ctx) {
    let trip: Trip;
    if (ctx.model) {
      // One Muse Spark call. A failure is reported, not retried; the agent loop stops a
      // repeat after two failures.
      let raw: Record<string, unknown> | null = null;
      try {
        const reply = await ctx.model.complete({
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: [
                `Today is ${new Date().toISOString().slice(0, 10)}.`,
                `Phone owner (going, but their messages aren't shown): ${ctx.userName}.`,
                ctx.home ? `Home base: ${ctx.home.city} (${ctx.home.airport ?? "?"}).` : "",
                "Chat:",
                ...ctx.chat.map((m) => `${m.sender}: ${m.text}`),
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        });
        raw = parseJsonReply(reply.content);
      } catch (err) {
        console.error("extract_trip model call failed", err);
        throw new ToolError("Couldn't read the chat right now. Ask the group where and when.");
      }
      if (!raw)
        throw new ToolError("Couldn't make sense of the chat. Ask the group where and when.");
      trip = toTrip(raw, ctx);
    } else {
      // MOCK: no Muse Spark key, so use the demo trip. People still come from the real chat.
      const people = [
        ...new Set([ctx.userName, ...ctx.chat.map((m) => m.sender), ...demoTrip.people]),
      ];
      trip = { ...demoTrip, people };
    }

    const where = trip.destination?.city;
    const nights =
      trip.startDate && trip.endDate
        ? (Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86_400_000
        : undefined;
    const budget = trip.budgetPerPersonUsd ? `$${trip.budgetPerPersonUsd} each` : undefined;
    const when = dateRange(trip.startDate, trip.endDate);
    await ctx.store.updatePlan(ctx.planId, {
      trip,
      title: where
        ? `${where} ${nights !== undefined && nights <= 3 ? "weekend" : "trip"}`
        : "New trip",
      summary: [`${trip.people.length} people`, when, budget && `under ${budget}`]
        .filter(Boolean)
        .join(", "),
    });

    return {
      summary: [where ?? "Where? (asking)", `${trip.people.length} people`, when, budget]
        .filter(Boolean)
        .join(" · "),
      data: trip,
    };
  },
});
