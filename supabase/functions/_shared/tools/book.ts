import { liveOffers } from "./booking_offers.ts";
import { defineTool, usd } from "./helpers.ts";
import { type BookingOffer, type StoredOption, ToolError } from "./types.ts";

interface Args {
  refs: string[];
}

// Flights are priced per person; a hotel's price is the whole stay for one room of two.
// Uses the cheapest live offer for an option when there is one, else the searched price.
function estimateTotal(options: StoredOption[], offers: BookingOffer[], people: number) {
  return options.reduce((sum, o) => {
    const price = offers.find((x) => x.ref === o.ref)?.priceCents ?? o.priceCents;
    if (price === undefined) return sum;
    if (o.category === "flight") return sum + price * people;
    if (o.category === "hotel") return sum + price * Math.ceil(people / 2);
    return sum + price;
  }, 0);
}

export const book = defineTool<Args>({
  name: "book",
  description:
    "Create the booking confirmation for the chosen options, with live booking links and the " +
    "cheapest seller for each. Only works after the group taps Book in the app; otherwise " +
    "show the final plan and stop. Never charges anyone.",
  parameters: {
    type: "object",
    properties: {
      refs: { type: "array", items: { type: "string" }, minItems: 1 },
    },
    required: ["refs"],
    additionalProperties: false,
  },
  describe: () => "Preparing the booking",
  // Up to 3 SerpAPI calls (flight returns → flight sellers, hotel prices), partly in parallel.
  timeoutMs: 20_000,
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
    // Already booked (e.g. a double tap): hand back that booking, no new SerpAPI lookups.
    if (plan.status === "booked" && plan.trip.booking) {
      const b = plan.trip.booking;
      return {
        summary: `Already confirmed ${b.confirmationCode} · ${usd(b.totalCents)} total`,
        data: { ...b, total_usd: b.totalCents / 100, already_booked: true },
      };
    }
    const offers = await liveOffers(chosen);
    const totalCents = estimateTotal(chosen, offers, plan.trip.people.length);
    // MOCK: no real booking or payment. The code is Huddle's; the offers link to the real
    // airline / hotel sites where each person books.
    const confirmationCode = `HDL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const booking = {
      confirmationCode,
      refs: chosen.map((o) => o.ref),
      totalCents,
      createdAt: new Date().toISOString(),
      offers,
    };
    await ctx.store.updatePlan(ctx.planId, {
      status: "booked",
      trip: { ...plan.trip, booking },
    });

    const best = chosen
      .map((o) => offers.find((x) => x.ref === o.ref)?.seller)
      .filter(Boolean)
      .join(", ");
    return {
      summary:
        `Confirmed ${confirmationCode} · ${usd(totalCents)} total` +
        (best ? ` · best prices: ${best}` : ""),
      data: {
        ...booking,
        total_usd: totalCents / 100,
        offers: offers.map((o) => ({
          ref: o.ref,
          seller: o.seller,
          price_usd: o.priceCents / 100,
        })),
      },
    };
  },
});
