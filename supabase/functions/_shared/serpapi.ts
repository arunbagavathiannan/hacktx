// SerpAPI client for the search tools (google_flights, google_hotels, google_maps).
// Key: `npx supabase secrets set SERPAPI_API_KEY=...` (serpapi.com/manage-api-key).
// Without a key, or if a live call fails, tools fall back to the fixtures in ./mocks/.

import { ToolError } from "./tools/types.ts";

export type Engine = "google_flights" | "google_hotels" | "google_maps";

// How long each engine gets. Live Google Flights regularly takes 6–15 s (a 6 s limit failed
// a real run); hotels and maps are quicker. Each search tool's own limit is set above these,
// leaving time to fall back to a fixture.
export const ENGINE_TIMEOUT_MS: Record<Engine, number> = {
  google_flights: 15_000,
  google_hotels: 12_000,
  google_maps: 8_000,
};

export const hasSerpapiKey = () => Boolean(Deno.env.get("SERPAPI_API_KEY"));

// Circuit breaker: after an outage, skip live calls for a while instead of hammering an API
// that is down or out of searches.
// - 401 / 403 / 429 (bad key, out of searches) pause every engine for 10 minutes, since
//   retrying can't fix them.
// - Server and network errors pause only that engine, for 60 s.
// - Timeouts don't trip it: a slow search isn't an outage, and one slow Flights call
//   shouldn't block Hotels or Maps.
// Lives in module memory, so it also covers back-to-back runs on the same worker.
const PAUSE_MS = { all: 10 * 60_000, engine: 60_000 };
const paused = new Map<Engine | "all", { until: number; reason: string }>();

export function serpapiPaused(engine: Engine): string | null {
  for (const key of ["all", engine] as const) {
    const p = paused.get(key);
    if (p && Date.now() < p.until) return p.reason;
  }
  return null;
}

// For tests.
export function resetSerpapiBreaker() {
  paused.clear();
}

function trip(engine: Engine, reason: string, status?: number) {
  const everyEngine = status === 401 || status === 403 || status === 429;
  paused.set(everyEngine ? "all" : engine, {
    until: Date.now() + (everyEngine ? PAUSE_MS.all : PAUSE_MS.engine),
    reason,
  });
}

const isTimeout = (err: unknown) => err instanceof Error && err.name === "TimeoutError";

export type SerpapiSource = "serpapi" | "fixture";

export async function serpapi<T>(
  engine: Engine,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const key = Deno.env.get("SERPAPI_API_KEY");
  if (!key) throw new Error("SERPAPI_API_KEY is not set");
  const pausedFor = serpapiPaused(engine);
  if (pausedFor) throw new Error(`SerpAPI paused after an earlier failure (${pausedFor})`);

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", engine);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("api_key", key);

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS[engine]) });
  } catch (err) {
    if (!isTimeout(err)) trip(engine, `network: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
  const body = await res.json().catch(() => ({}));
  // "No results" is a normal, empty answer, not an outage: don't trip, don't fall back.
  if (res.ok && /hasn't returned any results/i.test(String(body.error ?? ""))) return {} as T;
  if (!res.ok || body.error) {
    const reason = `${engine} ${res.status}: ${body.error ?? "request failed"}`;
    // A 400 is our request's fault, not an outage; it fails this call only.
    if (res.status !== 400) trip(engine, reason, res.status);
    throw new Error(`SerpAPI ${reason}`);
  }
  return body as T;
}

// Tries the live search, falling back to the fixture so the demo never shows an empty screen.
// `fixture` returns null when there's no fixture for this query (e.g. a city other than the
// demo's); then a failed live call becomes a friendly ToolError.
export async function liveOrFixture<T>(
  what: string,
  engine: Engine,
  live: () => Promise<T>,
  fixture: () => T | null,
): Promise<{ data: T; source: SerpapiSource }> {
  let slow = false;
  if (hasSerpapiKey() && !serpapiPaused(engine)) {
    try {
      return { data: await live(), source: "serpapi" };
    } catch (err) {
      slow = isTimeout(err);
      console.error(`live ${what} search failed, trying fixture`, err);
    }
  }
  const data = fixture();
  if (data === null) {
    throw new ToolError(
      !hasSerpapiKey()
        ? `Demo ${what} data only covers the Denver trip.`
        : slow
          ? `${what} search took too long. Carry on without it.`
          : `${what} search is down right now. Carry on without it.`,
    );
  }
  return { data, source: "fixture" };
}
