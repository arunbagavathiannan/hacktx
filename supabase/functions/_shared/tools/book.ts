import { defineTool, usd } from "./helpers.ts";
import { type StoredOption, ToolError } from "./types.ts";

interface Args {
  refs: string[];
}

// Flights are priced per person; a hotel's price is the whole stay for one room of two.
function estimateTotal(options: StoredOption[], people: number) {
  return options.reduce((sum, o) => {
    if (o.priceCents === undefined) return sum;
    if (o.category === "flight") return sum + o.priceCents * people;
    if (o.category === "hotel") return sum + o.priceCents * Math.ceil(people / 2);
    return sum + o.priceCents;
  }, 0);
}

export const book = defineTool<Args>({
  name: "book",
  description:
    "Create the booking confirmation for the chosen options. Only works after the group taps " +
    "Book in the app; otherwise show the final plan and stop. Never charges anyone.",
  parameters: {
    type: "object",
    properties: {
      refs: { type: "array", items: { type: "string" }, minItems: 1 },
    },
    required: ["refs"],
    additionalProperties: false,
  },
  describe: () => "Preparing the booking",
  async run(args, ctx) {
    // Guardrail: the agent proposes, people decide (CLAUDE.md).
    if (!ctx.bookingConfirmed) {
      throw new ToolError("The group hasn't tapped Book yet. Show the final plan and stop.");
    }

    const all = await ctx.store.listOptions(ctx.planId);
    const chosen = all.filter((o) => args.refs.includes(o.ref));
    const missing = args.refs.filter((r) => !chosen.some((o) => o.ref === r));
    if (missing.length > 0) {
      throw new ToolError(`These aren't pinned to the plan: ${missing.join(", ")}.`);
    }

    const plan = await ctx.store.getPlan(ctx.planId);
    const totalCents = estimateTotal(chosen, plan.trip.people.length);
    // MOCK: no real booking or payment. This only produces the confirmation screen's data.
    const confirmationCode = `HDL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const booking = {
      confirmationCode,
      refs: chosen.map((o) => o.ref),
      totalCents,
      createdAt: new Date().toISOString(),
    };
    await ctx.store.updatePlan(ctx.planId, {
      status: "booked",
      trip: { ...plan.trip, booking },
    });

    return {
      summary: `Confirmed ${confirmationCode} · ${usd(totalCents)} total`,
      data: { ...booking, total_usd: totalCents / 100 },
    };
  },
});
