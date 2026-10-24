import { count, defineTool } from "./helpers.ts";
import { type Category, ToolError } from "./types.ts";

interface Args {
  category: Category;
  question: string;
}

export const createPoll = defineTool<Args>({
  name: "create_poll",
  description:
    "Ask the group to vote between the pinned options in one category. Pin at least 2 options " +
    "in that category first. Then call tally_votes for the result.",
  parameters: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["flight", "hotel", "restaurant", "activity"] },
      question: { type: "string", description: 'Shown to the group, e.g. "Where should we stay?"' },
    },
    required: ["category", "question"],
    additionalProperties: false,
  },
  describe: (a) => `Asking the group: ${a.question}`,
  async run(args, ctx) {
    const options = (await ctx.store.listOptions(ctx.planId)).filter(
      (o) => o.category === args.category,
    );
    if (options.length < 2) {
      throw new ToolError(`Pin at least 2 ${args.category} options before making a poll.`);
    }

    const plan = await ctx.store.getPlan(ctx.planId);
    await ctx.store.updatePlan(ctx.planId, { status: "voting" });

    // MOCK: seed the other members' votes until realtime voting is built. Most back the first
    // pinned option and the last member picks the second, so the demo shows a clear 2–1 that
    // the phone owner's vote in the app can still swing.
    const others = plan.trip.people.filter((p) => p !== ctx.userName);
    await ctx.store.insertVotes(
      ctx.planId,
      others.map((voter, i) => ({
        voterName: voter,
        optionId: options[i === others.length - 1 && i > 0 ? 1 : 0].id,
      })),
    );

    return {
      summary: `Poll open: ${count(options.length, args.category)}`,
      data: {
        category: args.category,
        question: args.question,
        options: options.map((o) => ({ ref: o.ref, title: o.title })),
        votes_so_far: others.length,
      },
    };
  },
});
