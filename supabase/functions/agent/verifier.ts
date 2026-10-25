import { type ChatModel, parseJsonReply } from "../_shared/muse.ts";
import type { ChatMessage, StoredOption, Trip } from "../_shared/tools/types.ts";

// The verifier checks the plan before anyone sees it (see "Agent design" in CLAUDE.md).
// Code checks catch what can be checked exactly; a separate Muse Spark pass reads the chat
// and the plan for anything the code can't see.

export interface Verdict {
  ok: boolean;
  issues: string[];
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

export function codeChecks(trip: Trip, options: StoredOption[]): string[] {
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
    if (!o.url?.startsWith("https://")) issues.push(`${o.title} has no working link.`);

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

  if (trip.budgetPerPersonUsd !== undefined && options.length > 0) {
    const each = perPersonCents(options) / 100;
    if (each > trip.budgetPerPersonUsd) {
      issues.push(`About $${Math.round(each)} each, over the $${trip.budgetPerPersonUsd} budget.`);
    }
  }

  return issues;
}

const SYSTEM = `You are Huddle's verifier. Check a group trip plan before the group sees it.
Using the chat, the extracted trip and the pinned options, look for: prices or links that
don't match the search results in "details", dates or people that don't match the chat,
a plan over budget, and constraints from the chat that were ignored. "code_issues" lists
problems already found by exact checks. Reply with JSON only:
{"ok": boolean, "issues": ["short, specific problem", ...]}`;

export async function verify(
  model: ChatModel,
  chat: ChatMessage[],
  trip: Trip,
  options: StoredOption[],
): Promise<Verdict> {
  const issues = codeChecks(trip, options);

  const snapshot = {
    chat: chat.map((m) => `${m.sender}: ${m.text}`),
    trip,
    options: options.map(({ ref, category, title, priceCents, url, isSelected, details }) => ({
      ref,
      category,
      title,
      price_usd: priceCents === undefined ? undefined : priceCents / 100,
      url,
      selected: isSelected,
      details,
    })),
    code_issues: issues,
  };

  try {
    const reply = await model.complete({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(snapshot) },
      ],
    });
    const parsed = parseJsonReply(reply.content) ?? {};
    for (const issue of Array.isArray(parsed.issues) ? parsed.issues : []) {
      if (typeof issue === "string" && !issues.includes(issue)) issues.push(issue);
    }
  } catch (err) {
    // The model pass is extra; the code checks still stand if it fails.
    console.error("verifier model pass failed", err);
  }

  return {
    ok: issues.length === 0,
    issues,
    checked: options.length,
    perPersonUsd: options.length ? Math.round(perPersonCents(options) / 100) : undefined,
  };
}
