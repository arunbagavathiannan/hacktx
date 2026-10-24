import { count, defineTool } from "./helpers.ts";
import { type Category, type Option, ToolError } from "./types.ts";

interface Args {
  refs: string[];
}

export const pinOnMap = defineTool<Args>({
  name: "pin_on_map",
  description:
    "Add search results to the plan: they appear as pins on the map and as options the group " +
    "can see and vote on. Pin only the best 2–4 per category.",
  parameters: {
    type: "object",
    properties: {
      refs: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: 'Refs from search results, e.g. ["hotel_1", "hotel_3"]',
      },
    },
    required: ["refs"],
    additionalProperties: false,
  },
  describe: (a) =>
    `Pinning ${a.refs.length === 1 ? "1 spot" : `${a.refs.length} spots`} on the map`,
  async run(args, ctx) {
    const unknown = args.refs.filter((r) => !ctx.found.has(r));
    if (unknown.length > 0) {
      throw new ToolError(`Unknown refs: ${unknown.join(", ")}. Use refs from a search result.`);
    }

    const pinned = new Set((await ctx.store.listOptions(ctx.planId)).map((o) => o.ref));
    const fresh = [...new Set(args.refs)]
      .filter((r) => !pinned.has(r))
      .map((r) => ctx.found.get(r) as Option);
    const stored = fresh.length > 0 ? await ctx.store.insertOptions(ctx.planId, fresh) : [];

    const byCategory = new Map<Category, number>();
    for (const o of stored) byCategory.set(o.category, (byCategory.get(o.category) ?? 0) + 1);
    const what = [...byCategory].map(([c, n]) => count(n, c)).join(", ");

    return {
      summary: stored.length > 0 ? `Pinned ${what}` : "Already on the map",
      data: {
        pinned: stored.map((o) => o.ref),
        already_pinned: args.refs.filter((r) => pinned.has(r)),
      },
    };
  },
});
