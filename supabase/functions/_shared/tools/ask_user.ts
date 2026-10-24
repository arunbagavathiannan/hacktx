import { defineTool } from "./helpers.ts";

interface Args {
  question: string;
}

export const askUser = defineTool<Args>({
  name: "ask_user",
  description:
    "Ask the group a clarifying question when the chat is missing something you need, like " +
    "dates or budget. The run stops here until they answer, so ask one clear question.",
  parameters: {
    type: "object",
    properties: {
      question: { type: "string", description: 'e.g. "Which weekend works: Nov 13 or Nov 20?"' },
    },
    required: ["question"],
    additionalProperties: false,
  },
  describe: () => "Checking with the group",
  async run(args, ctx) {
    await ctx.store.updatePlan(ctx.planId, {
      status: "needs_input",
      pendingQuestion: args.question,
    });
    return {
      summary: args.question,
      data: { asked: true, note: "Stop now and wait for the group's answer." },
    };
  },
});
