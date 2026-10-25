import type { Category, Option, Tool, ToolArgs, ToolContext } from "./types.ts";

// Wraps a typed tool so the registry can hold every tool in one list. runTool checks required
// args against the schema before calling run.
export function defineTool<A>(tool: Tool<A>): Tool<ToolArgs> {
  return tool as unknown as Tool<ToolArgs>;
}

// Adds search results to this run's found list with a fresh ref ("hotel_3").
export function addFound(ctx: ToolContext, options: Omit<Option, "ref">[]): Option[] {
  return options.map((o) => {
    const n = [...ctx.found.values()].filter((f) => f.category === o.category).length + 1;
    const option = { ...o, ref: `${o.category}_${n}` };
    ctx.found.set(option.ref, option);
    return option;
  });
}

// The compact view of an option the model sees.
export function forModel(o: Option) {
  return {
    ref: o.ref,
    title: o.title,
    subtitle: o.subtitle,
    price_usd: o.priceCents === undefined ? undefined : o.priceCents / 100,
  };
}

export const usd = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const nouns: Record<Category, [string, string]> = {
  flight: ["flight", "flights"],
  hotel: ["hotel", "hotels"],
  restaurant: ["restaurant", "restaurants"],
  activity: ["activity", "activities"],
};

// (3, "activity") → "3 activities"
export const count = (n: number, category: Category) => `${n} ${nouns[category][n === 1 ? 0 : 1]}`;

// "2026-11-20 13:15" → "1:15 PM"
export function clock(serpapiTime: string) {
  const [h, m] = serpapiTime.split(" ")[1].split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// "2026-11-20" → "Fri"
export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

// 130 → "2h 10m"
export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function clampResults(value: unknown, fallback = 5) {
  const n = typeof value === "number" ? Math.floor(value) : fallback;
  return Math.min(Math.max(n, 1), 8);
}

// MOCK: the fixtures only cover the demo trip.
export const isDemoCity = (location: string) => /denver|\bden\b/i.test(location);
