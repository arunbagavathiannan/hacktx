import { demoTrip } from "../mocks/demo-trip.ts";
import { defineTool } from "./helpers.ts";
import type { Trip } from "./types.ts";

export const extractTrip = defineTool<Record<string, never>>({
  name: "extract_trip",
  description:
    "Read the group chat and pull out who is going, origin, destination, dates, budget per " +
    "person and constraints. Call this first. Lists anything the chat didn't settle in `missing`.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  describe: () => "Reading the chat",
  async run(_args, ctx) {
    // MOCK: returns the demo trip. Muse Spark does the extraction once the key is in.
    // People still come from the real chat senders, plus the phone owner.
    const senders = ctx.chat.map((m) => m.sender);
    const people = [...new Set([ctx.userName, ...senders, ...demoTrip.people])];
    const trip: Trip = { ...demoTrip, people };

    const where = trip.destination?.city ?? "a trip";
    await ctx.store.updatePlan(ctx.planId, {
      trip,
      title: `${where} weekend`,
      summary: `${people.length} people, ${trip.startDate} to ${trip.endDate}, under $${trip.budgetPerPersonUsd} each`,
    });

    return {
      summary: `${where} · ${people.length} people · Nov 20–22 · $${trip.budgetPerPersonUsd} each`,
      data: trip,
    };
  },
});
