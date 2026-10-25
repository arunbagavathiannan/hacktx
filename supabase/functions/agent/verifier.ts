import { type ChatModel, parseJsonReply } from "../_shared/muse.ts";
import { nightlyCapUsd, type Preferences, wantsNonstop } from "../_shared/preferences.ts";
import type { ChatMessage, StoredOption, Trip } from "../_shared/tools/types.ts";

// The verifier checks the plan before anyone sees it (see "Agent design" in CLAUDE.md).
// Code checks catch what can be checked exactly; a separate Muse Spark pass reads the chat
// and the plan for anything the code can't see.

export interface Verdict {
  ok: boolean;
  issues: string[];
  // Shown to the group but never block the plan: going over budget is the group's call.
  warnings: string[];
  checked: number;
  perPersonUsd?: number;
}

// What one person pays: their flight plus half a room (two to a room).
export function perPersonCents(options: StoredOption[]) {
  const pick = (category: string) => {
    const inCategory = options.filter((o) => o.category === category && o.priceCents !== undefined);
    const selected = inCategory.find((o) => o.isSelected);
    if (selected) return selected.priceCents ?? 0;
    return inCategory.length ? Math.min(...inCategory.map((o) => o.priceCents ?? 0)) : 0;
  };
  return pick("flight") + Math.round(pick("hotel") / 2);
}

// Budget checks: the trip's per-person budget and the owner's budget tier. These are
// warnings, not issues. An over-budget plan still goes ahead, with the overage spelled out.
export function budgetWarnings(trip: Trip, options: StoredOption[], prefs?: Preferences): string[] {
  const warnings: string[] = [];
  if (trip.budgetPerPersonUsd !== undefined && options.length > 0) {
    const each = Math.round(perPersonCents(options) / 100);
    if (each > trip.budgetPerPersonUsd) {
      warnings.push(
        `About $${each} each, $${each - trip.budgetPerPersonUsd} over the $${trip.budgetPerPersonUsd} budget.`,
      );
    }
  }

  // The owner's budget tier: the chosen hotel (or, before a vote, at least one option)
  // should fit the nightly cap.
  const cap = nightlyCapUsd(prefs);
  const hotels = options.filter((o) => o.category === "hotel");
  const perNight = (o: StoredOption) => Number(o.details.rate_per_night ?? 0);
  if (cap !== undefined && hotels.length) {
    const chosen = hotels.find((o) => o.isSelected);
    if (chosen && perNight(chosen) > cap) {
      warnings.push(
        `${chosen.title} is $${perNight(chosen)}/night, over the ${prefs?.budget} budget (~$${cap}).`,
      );
    } else if (!chosen && hotels.every((o) => perNight(o) > cap)) {
      warnings.push(`Every hotel is over the ${prefs?.budget} budget (~$${cap}/night).`);
    }
  }
  return warnings;
}

export function codeChecks(trip: Trip, options: StoredOption[], prefs?: Preferences): string[] {
  const issues: string[] = [];

  if (options.length === 0) issues.push("Nothing is pinned to the plan yet.");

  for (const o of options) {
    const d = o.details;
    // Prices must match the raw search result they came from.
    const source =
      o.category === "flight" ? d.price : o.category === "hotel" ? d.total_rate : undefined;
    if (typeof source === "number" && o.priceCents !== source * 100) {
      issues.push(
        `${o.title}: shows $${(o.priceCents ?? 0) / 100} but the search said $${source}.`,
      );
    }
    if (!/^https?:\/\//.test(o.url ?? "")) issues.push(`${o.title} has no working link.`);

    // Dates must match the trip from the chat.
    const [from, to] =
      o.category === "flight"
        ? [d.outbound_date, d.return_date]
        : o.category === "hotel"
          ? [d.check_in_date, d.check_out_date]
          : [undefined, undefined];
    if (from !== undefined && (from !== trip.startDate || to !== trip.endDate)) {
      issues.push(
        `${o.title} is for ${from} – ${to}, but the trip is ${trip.startDate} – ${trip.endDate}.`,
      );
    }
  }

  // "Short flight" means nonstop.
  if (wantsNonstop(prefs)) {
    for (const o of options.filter((x) => x.category === "flight" && Number(x.details.stops) > 0)) {
      issues.push(`${o.title} has a stop, but the owner wants short nonstop flights.`);
    }
  }

  return issues;
}

export const VERIFIER_TIMEOUT_MS = 35_000;

// The raw search fields the verifier compares against (prices, dates, stops, ratings, food).
// Descriptions, amenities, tokens and the like stay out of the prompt.
const CHECKED_DETAILS = [
  "source",
  "price",
  "stops",
  "outbound_date",
  "return_date",
  "departure_time",
  "total_duration",
  "rate_per_night",
  "total_rate",
  "check_in_date",
  "check_out_date",
  "overall_rating",
  "rating",
  "type",
  "address",
  "dietary",
];

function pick(details: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    keys.filter((k) => details[k] !== undefined).map((k) => [k, details[k]]),
  );
}

const SYSTEM = `You are Huddle's verifier. Check a group trip plan before the group sees it.
Using the chat, the extracted trip and the pinned options, look for: prices or links that
don't match the search results in "details", dates or people that don't match the chat,
constraints from the chat that were ignored, and options that clash
with "preferences" (the owner's onboarding answers: food restrictions are hard rules, so flag
any restaurant that doesn't work for them; vibe, budget and travel are strong leanings). "owner" is the phone
owner: they are in the group even though none of their messages are in the chat (Huddle
reads other people's messages from notifications, so the owner's own messages never appear).
Don't flag the owner as missing from the chat. Being over budget is NOT an issue: the plan
goes ahead and the group sees a budget warning, so leave budget out of "issues". "code_issues" lists problems already found
by exact checks. Reply with JSON only:
{"ok": boolean, "issues": ["short, specific problem", ...]}`;

export async function verify(
  model: ChatModel,
  chat: ChatMessage[],
  trip: Trip,
  options: StoredOption[],
  owner: string,
  prefs?: Preferences,
): Promise<Verdict> {
  const issues = codeChecks(trip, options, prefs);
  const warnings = budgetWarnings(trip, options, prefs);

  // Only what the checks need: a smaller prompt is a faster (and cheaper) Muse Spark call.
  const { booking: _booking, ...tripFacts } = trip;
  const snapshot = {
    owner,
    preferences: prefs ?? null,
    chat: chat.map((m) => `${m.sender}: ${m.text}`),
    trip: tripFacts,
    options: options.map(({ ref, category, title, priceCents, url, isSelected, details }) => ({
      ref,
      category,
      title,
      price_usd: priceCents === undefined ? undefined : priceCents / 100,
      url,
      selected: isSelected,
      details: pick(details, CHECKED_DETAILS),
    })),
    code_issues: issues,
  };

  try {
    const reply = await model.complete({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(snapshot) },
      ],
      // Reading a whole plan takes longer than a normal call (20 s timed out live).
      timeoutMs: VERIFIER_TIMEOUT_MS,
    });
    const parsed = parseJsonReply(reply.content) ?? {};
    for (const issue of Array.isArray(parsed.issues) ? parsed.issues : []) {
      if (typeof issue !== "string" || issues.includes(issue)) continue;
      // If the model still raises the budget, it's a warning like the code check's.
      if (/budget|over \$|exceed/i.test(issue)) {
        if (!warnings.length) warnings.push(issue);
      } else issues.push(issue);
    }
  } catch (err) {
    // The model pass is extra; the code checks still stand if it fails.
    console.error("verifier model pass failed", err);
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    checked: options.length,
    perPersonUsd: options.length ? Math.round(perPersonCents(options) / 100) : undefined,
  };
}
