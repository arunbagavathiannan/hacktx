import type { IndividualPlan, StoredOption, Trip } from "../_shared/tools/types.ts";

// Each person's version of the group plan. Plain code (no model call): everyone shares the
// hotel, the group travels on its pick, and anyone that pick puts over their own budget gets
// the closest option that fits (a cheaper flight, then a bus or driving). If nothing fits, they
// keep the cheapest option and see how far over they are.

const PEOPLE_PER_ROOM = 2;
const dollars = (cents: number) => Math.round(cents / 100);

const isFlight = (o: StoredOption) => !o.details.mode || o.details.mode === "fly";

// The group's way there: the cheapest nonstop flight, else the cheapest flight, else the
// cheapest priced option of any kind (a trip only reachable by land).
export function groupTravel(options: StoredOption[]): StoredOption | undefined {
  const travel = options.filter((o) => o.category === "flight");
  const priced = travel.filter((o) => o.priceCents !== undefined);
  const cheapest = (list: StoredOption[]) =>
    [...list].sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0))[0];
  const flights = priced.filter(isFlight);
  return (
    cheapest(flights.filter((o) => Number(o.details.stops ?? 0) === 0)) ??
    cheapest(flights) ??
    cheapest(priced) ??
    travel[0]
  );
}

// The shared hotel: the selected one, else the cheapest pinned.
export function groupHotel(options: StoredOption[]): StoredOption | undefined {
  const hotels = options.filter((o) => o.category === "hotel" && o.priceCents !== undefined);
  return (
    hotels.find((o) => o.isSelected) ??
    [...hotels].sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0))[0]
  );
}

export function individualPlans(trip: Trip, options: StoredOption[]): IndividualPlan[] {
  const hotel = groupHotel(options);
  const hotelShareUsd = hotel ? dollars((hotel.priceCents ?? 0) / PEOPLE_PER_ROOM) : 0;
  const group = groupTravel(options);
  const priced = options
    .filter((o) => o.category === "flight" && o.priceCents !== undefined)
    .sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0));

  return trip.people.map((name): IndividualPlan => {
    const budgetUsd = trip.budgets?.[name] ?? trip.budgetPerPersonUsd;
    const cost = (o?: StoredOption) => (o?.priceCents ?? 0) / 100 + hotelShareUsd;
    const fits = (o?: StoredOption) => budgetUsd === undefined || cost(o) <= budgetUsd;

    let travel = group;
    let note: string | undefined;
    if (budgetUsd !== undefined && group?.priceCents !== undefined && !fits(group)) {
      // The group's pick is over this person's budget: the closest thing to it that fits (the
      // priciest option under budget, so a cheaper flight beats a long drive when both fit).
      const cheaper = [...priced].reverse().find(fits);
      travel = cheaper ?? priced[0] ?? group;
      if (travel && travel !== group) {
        note = cheaper
          ? `${travel.title} keeps ${name} under their $${budgetUsd} budget`
          : `Nothing fits $${budgetUsd}; ${travel.title} is the cheapest way there`;
      }
    }

    const travelUsd = travel?.priceCents !== undefined ? dollars(travel.priceCents) : undefined;
    const totalUsd = (travelUsd ?? 0) + hotelShareUsd;
    const over = budgetUsd !== undefined ? totalUsd - budgetUsd : 0;
    return {
      name,
      budgetUsd,
      travelRef: travel?.ref,
      travel: travel?.title ?? "Getting there TBD",
      travelUsd,
      hotelShareUsd,
      totalUsd,
      ...(over > 0 ? { overBudgetUsd: over } : {}),
      ...(note ? { note } : {}),
    };
  });
}

// The agent's choice in each category, which the plan starts from: the group's way there,
// the shared hotel, and the best-rated activity and restaurant. Everything else pinned stays
// an alternative the group can switch to.
export function agentPicks(options: StoredOption[]): StoredOption[] {
  const rating = (o: StoredOption) => Number(o.details.rating ?? o.details.overall_rating ?? 0);
  const best = (category: StoredOption["category"]) =>
    options.filter((o) => o.category === category).sort((a, b) => rating(b) - rating(a))[0];
  return [groupTravel(options), groupHotel(options), best("activity"), best("restaurant")].filter(
    (o): o is StoredOption => Boolean(o),
  );
}
