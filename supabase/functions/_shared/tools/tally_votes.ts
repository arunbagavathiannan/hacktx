import { defineTool, plural } from "./helpers.ts";
import { type Category, type StoredOption, ToolError, type Vote } from "./types.ts";

interface Args {
  category: Category;
}

// True when every category that got votes has a winner. The agent loop marks the plan ready
// only when this holds and the verifier has passed.
export function pollsDecided(options: StoredOption[], votes: Vote[]) {
  const votedIds = new Set(votes.map((v) => v.optionId));
  const polled = new Set(options.filter((o) => votedIds.has(o.id)).map((o) => o.category));
  const decided = new Set(options.filter((o) => o.isSelected).map((o) => o.category));
  return [...polled].every((c) => decided.has(c));
}

export const tallyVotes = defineTool<Args>({
  name: "tally_votes",
  description:
    "Count the group's votes in one category and mark the winner. Ties go to the cheaper " +
    "option. Once every poll has a winner, summarize the plan; it's checked before the group " +
    "sees it.",
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

    // Not marked ready here: the verifier checks the plan first (agent/loop.ts).
    const afterTally = options.map((o) =>
      o.category === args.category ? { ...o, isSelected: o.id === winner.id } : o,
    );

    return {
      summary: `${winner.title} wins with ${tallies[0].votes} of ${plural(total, "vote")}`,
      data: {
        winner: winner.ref,
        tallies: tallies.map((t) => ({ ref: t.option.ref, title: t.option.title, votes: t.votes })),
        all_polls_decided: pollsDecided(afterTally, votes),
      },
    };
  },
});
