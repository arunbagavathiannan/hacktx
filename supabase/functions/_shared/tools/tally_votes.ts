import { defineTool, plural } from "./helpers.ts";
import { type Category, ToolError } from "./types.ts";

interface Args {
  category: Category;
}

export const tallyVotes = defineTool<Args>({
  name: "tally_votes",
  description:
    "Count the group's votes in one category and mark the winner. Ties go to the cheaper " +
    "option. When every polled category has a winner, the plan is ready.",
  parameters: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["flight", "hotel", "restaurant", "activity"] },
    },
    required: ["category"],
    additionalProperties: false,
  },
  describe: (a) => `Counting ${a.category} votes`,
  async run(args, ctx) {
    const options = await ctx.store.listOptions(ctx.planId);
    const inCategory = options.filter((o) => o.category === args.category);
    const votes = await ctx.store.listVotes(ctx.planId);

    const tallies = inCategory
      .map((o) => ({ option: o, votes: votes.filter((v) => v.optionId === o.id).length }))
      .sort(
        (a, b) =>
          b.votes - a.votes ||
          (a.option.priceCents ?? Number.MAX_SAFE_INTEGER) -
            (b.option.priceCents ?? Number.MAX_SAFE_INTEGER),
      );

    const total = tallies.reduce((sum, t) => sum + t.votes, 0);
    if (total === 0) {
      throw new ToolError(`No ${args.category} votes yet. Make a poll first, or wait.`);
    }

    const winner = tallies[0].option;
    await ctx.store.selectOption(ctx.planId, args.category, winner.id);

    // Ready once every category that got votes has a winner.
    const votedIds = new Set(votes.map((v) => v.optionId));
    const polled = new Set(options.filter((o) => votedIds.has(o.id)).map((o) => o.category));
    const decided = new Set(
      options.filter((o) => o.isSelected || o.id === winner.id).map((o) => o.category),
    );
    const ready = [...polled].every((c) => decided.has(c));
    if (ready) await ctx.store.updatePlan(ctx.planId, { status: "ready" });

    return {
      summary: `${winner.title} wins with ${tallies[0].votes} of ${plural(total, "vote")}`,
      data: {
        winner: winner.ref,
        tallies: tallies.map((t) => ({ ref: t.option.ref, title: t.option.title, votes: t.votes })),
        plan_ready: ready,
      },
    };
  },
});
