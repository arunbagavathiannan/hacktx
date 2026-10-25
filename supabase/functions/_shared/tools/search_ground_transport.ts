import { liveOrFixture, serpapi } from "../serpapi.ts";
import { addFound, defineTool, duration, forModel, usd } from "./helpers.ts";
import { type Option, ToolError } from "./types.ts";

interface Args {
  from: string; // "Austin, TX"
  to: string; // "Dallas, TX"
  date: string; // YYYY-MM-DD, the day the group leaves
  modes?: ("transit" | "drive")[];
}

// The fields this tool reads from SerpAPI Google Maps Directions. Live results have more.
interface DirectionsStep {
  title?: string;
}
interface DirectionsTrip {
  travel_mode?: string;
  title?: string;
  details?: DirectionsStep[];
}
interface Direction {
  travel_mode?: string;
  via?: string;
  distance?: number; // meters
  duration?: number; // seconds
  formatted_duration?: string;
  formatted_distance?: string;
  cost?: number; // not documented; used only if SerpAPI ever sends one
  trips?: DirectionsTrip[];
}
export interface DirectionsResponse {
  directions?: Direction[];
}

// SerpAPI travel_mode values.
const TRANSIT = 3;
const DRIVING = 0;

// Driving cost, per mile per car: gas plus a little wear (about $3.50/gal at 25 mpg = $0.14).
// An estimate, and labeled as one; up to four people share a car.
const DRIVE_COST_PER_MILE = 0.2;
const SEATS_PER_CAR = 4;
const MAX_TRANSIT = 3;

const METERS_PER_MILE = 1609.34;

// "Amtrak Texas Eagle" → train, "Greyhound 1442" → bus. Line names come from the steps.
function transitKind(d: Direction): { kind: "Train" | "Bus" | "Transit"; carrier: string } {
  const text = [
    d.via,
    ...(d.trips ?? []).flatMap((t) => [t.title, ...(t.details ?? []).map((s) => s.title)]),
  ]
    .filter(Boolean)
    .join(" ");
  const carrier =
    text.match(
      /\b(Amtrak|Greyhound|FlixBus|Megabus|Peter Pan|Trailways|Brightline|VIA Rail|Red Coach|Vonlane)\b/i,
    )?.[1] ?? "";
  if (/amtrak|brightline|via rail|\btrain\b|\brail\b|\bmetra\b|caltrain/i.test(text)) {
    return { kind: "Train", carrier: carrier || "Train" };
  }
  if (/\bbus\b|greyhound|flixbus|megabus|coach|trailways|peter pan|vonlane/i.test(text)) {
    return { kind: "Bus", carrier: carrier || "Bus" };
  }
  return { kind: "Transit", carrier: carrier || "Transit" };
}

const mapsUrl = (from: string, to: string, mode: "transit" | "driving") =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}` +
  `&destination=${encodeURIComponent(to)}&travelmode=${mode}`;

export const searchGroundTransport = defineTool<Args>({
  name: "search_ground_transport",
  description:
    "Find ways to get there by land: train, bus (Google Maps transit, via SerpAPI) and driving. " +
    "Use it alongside search_flights when the trip is reasonable over land (roughly under 10 " +
    "hours), so the group can compare. Train and bus fares are on the seller's site " +
    "(price_usd empty); driving shows a gas estimate per person, round trip. Returns options " +
    "with a `ref` to use in pin_on_map.",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: 'Where the group leaves from, e.g. "Austin, TX"' },
      to: { type: "string", description: 'The destination, e.g. "Dallas, TX"' },
      date: { type: "string", description: "YYYY-MM-DD, the day they leave" },
      modes: {
        type: "array",
        items: { type: "string", enum: ["transit", "drive"] },
        description: "Default: both",
      },
    },
    required: ["from", "to", "date"],
    additionalProperties: false,
  },
  describe: (a) => `Checking trains, buses and driving to ${a.to}`,
  // Two Directions calls (transit, then driving).
  timeoutMs: 2 * 10_000 + 3_000,
  async run(args, ctx) {
    const modes = args.modes?.length ? args.modes : ["transit", "drive"];
    const plan = await ctx.store.getPlan(ctx.planId);
    const people = Math.max(1, plan.trip.people.length);
    const returnDate = plan.trip.endDate ?? args.date;
    // Transit schedules need a time: leave around 8 AM on the travel day.
    const departAt = Math.floor(Date.parse(`${args.date}T08:00:00`) / 1000);

    const directions = (travelMode: number) =>
      liveOrFixture<DirectionsResponse>(
        "transport",
        "google_maps_directions",
        () =>
          serpapi("google_maps_directions", {
            start_addr: args.from,
            end_addr: args.to,
            travel_mode: travelMode,
            distance_unit: 1,
            ...(travelMode === TRANSIT && Number.isFinite(departAt)
              ? { time: `depart_at:${departAt}` }
              : {}),
          }),
        // No fixture: land routes depend on the city pair.
        () => null,
      ).catch((err) => {
        // One mode failing (e.g. no transit across an ocean) shouldn't hide the other.
        console.error(`ground transport (${travelMode}) failed`, err);
        return { data: {} as DirectionsResponse };
      });

    const [transit, drive] = await Promise.all([
      modes.includes("transit") ? directions(TRANSIT) : { data: {} as DirectionsResponse },
      modes.includes("drive") ? directions(DRIVING) : { data: {} as DirectionsResponse },
    ]);

    const pin = { lat: plan.trip.destination?.lat, lng: plan.trip.destination?.lng };
    const common = { outbound_date: args.date, return_date: returnDate, stops: 0 };
    const found: Omit<Option, "ref">[] = [];

    for (const d of (transit.data.directions ?? []).slice(0, MAX_TRANSIT)) {
      if (!d.duration) continue;
      const { kind, carrier } = transitKind(d);
      const minutes = Math.round(d.duration / 60);
      found.push({
        category: "flight",
        title: `${carrier} · ${kind}`,
        subtitle: [d.formatted_duration ?? duration(minutes), d.formatted_distance, "fare on site"]
          .filter(Boolean)
          .join(" · "),
        priceCents: typeof d.cost === "number" ? Math.round(d.cost * 100) : undefined,
        currency: "USD",
        url: mapsUrl(args.from, args.to, "transit"),
        ...pin,
        details: {
          source: "serpapi_google_maps_directions",
          mode: kind.toLowerCase(),
          via: d.via,
          duration_min: minutes,
          distance_miles: d.distance ? Math.round(d.distance / METERS_PER_MILE) : undefined,
          ...common,
        },
      });
    }

    const road = drive.data.directions?.[0];
    if (road?.distance && road.duration) {
      const miles = Math.round(road.distance / METERS_PER_MILE);
      const minutes = Math.round(road.duration / 60);
      const cars = Math.ceil(people / SEATS_PER_CAR);
      // Round trip, split across everyone going.
      const perPersonUsd = Math.round((miles * 2 * DRIVE_COST_PER_MILE * cars) / people);
      found.push({
        category: "flight",
        title: "Drive",
        subtitle: `${road.formatted_duration ?? duration(minutes)} · ${miles} mi · gas est. ${usd(perPersonUsd * 100)} each`,
        priceCents: perPersonUsd * 100,
        currency: "USD",
        url: mapsUrl(args.from, args.to, "driving"),
        ...pin,
        details: {
          source: "serpapi_google_maps_directions",
          mode: "drive",
          via: road.via,
          duration_min: minutes,
          distance_miles: miles,
          cars,
          price_is_estimate: true,
          ...common,
        },
      });
    }

    if (found.length === 0) {
      throw new ToolError(`No train, bus or driving route to ${args.to}. Stick with flights.`);
    }

    const options = addFound(ctx, found);
    const kinds = [...new Set(options.map((o) => o.title.split(" · ").at(-1)))];
    return {
      summary: `Found ${kinds.join(", ").toLowerCase()} options`,
      data: options.map((o) => ({ ...forModel(o), mode: o.details.mode })),
    };
  },
});
