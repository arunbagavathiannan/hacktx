// SerpAPI client for the search tools (google_flights, google_hotels, google_maps).
// Key: `npx supabase secrets set SERPAPI_API_KEY=...` (serpapi.com/manage-api-key).
// Without a key, or if a live call fails, tools fall back to the fixtures in ./mocks/.

import { ToolError } from "./tools/types.ts";

// Under runTool's 8 s limit, leaving time to fall back to a fixture.
const TIMEOUT_MS = 6_000;

export const hasSerpapiKey = () => Boolean(Deno.env.get("SERPAPI_API_KEY"));

// Circuit breaker: after a failure, skip live calls for a while instead of hammering an API
// that is down or out of searches. Auth / quota errors (401, 403, 429) pause longer, since
// retrying can't fix them. Lives in module memory, so it also covers back-to-back runs on
// the same Edge Function worker.
const PAUSE_MS = { quota: 10 * 60_000, other: 60_000 };
let pausedUntil = 0;
let pauseReason = "";

export function serpapiPaused() {
  return Date.now() < pausedUntil ? pauseReason : null;
}

// For tests.
export function resetSerpapiBreaker() {
  pausedUntil = 0;
  pauseReason = "";
}

function trip(reason: string, status?: number) {
  const quota = status === 401 || status === 403 || status === 429;
  pausedUntil = Date.now() + (quota ? PAUSE_MS.quota : PAUSE_MS.other);
  pauseReason = reason;
}

export type SerpapiSource = "serpapi" | "fixture";

export async function serpapi<T>(
  engine: "google_flights" | "google_hotels" | "google_maps",
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const key = Deno.env.get("SERPAPI_API_KEY");
  if (!key) throw new Error("SERPAPI_API_KEY is not set");
  const paused = serpapiPaused();
  if (paused) throw new Error(`SerpAPI paused after an earlier failure (${paused})`);

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
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    trip(`network: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
  const body = await res.json().catch(() => ({}));
  // "No results" is a normal, empty answer, not an outage: don't trip, don't fall back.
  if (res.ok && /hasn't returned any results/i.test(String(body.error ?? ""))) return {} as T;
  if (!res.ok || body.error) {
    const reason = `${engine} ${res.status}: ${body.error ?? "request failed"}`;
    trip(reason, res.status);
    throw new Error(`SerpAPI ${reason}`);
  }
  return body as T;
}

// Tries the live search, falling back to the fixture so the demo never shows an empty screen.
// `fixture` returns null when there's no fixture for this query (e.g. a city other than the
// demo's); then a failed live call becomes a friendly ToolError.
export async function liveOrFixture<T>(
  what: string,
  live: () => Promise<T>,
  fixture: () => T | null,
): Promise<{ data: T; source: SerpapiSource }> {
  if (hasSerpapiKey() && !serpapiPaused()) {
    try {
      return { data: await live(), source: "serpapi" };
    } catch (err) {
      console.error(`live ${what} search failed, trying fixture`, err);
    }
  }
  const data = fixture();
  if (data === null) {
    throw new ToolError(
      hasSerpapiKey()
        ? `${what} search is down right now. Carry on without it.`
        : `Demo ${what} data only covers the Denver trip.`,
    );
  }
  return { data, source: "fixture" };
}
