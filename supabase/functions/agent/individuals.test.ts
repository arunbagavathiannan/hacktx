// deno test --allow-env supabase/functions/agent/individuals.test.ts

import { assertEquals } from "jsr:@std/assert@1";
import type { StoredOption, Trip } from "../_shared/tools/types.ts";
import { groupTravel, individualPlans } from "./individuals.ts";

const option = (o: Partial<StoredOption> & Pick<StoredOption, "ref" | "title">): StoredOption => ({
  id: o.ref,
  category: "flight",
  currency: "USD",
  url: "https://example.com",
  isSelected: false,
  details: {},
  ...o,
});

// Nonstop $300, 1-stop $180, bus (fare unknown), drive $40 each; hotel $400 for the stay.
const options = [
  option({ ref: "flight_1", title: "United · Nonstop", priceCents: 30000, details: { stops: 0 } }),
  option({ ref: "flight_2", title: "American · 1 stop", priceCents: 18000, details: { stops: 1 } }),
  option({ ref: "flight_3", title: "Greyhound · Bus", details: { mode: "bus", stops: 0 } }),
  option({
    ref: "flight_4",
    title: "Drive",
    priceCents: 4000,
    details: { mode: "drive", stops: 0 },
  }),
  option({ ref: "hotel_1", category: "hotel", title: "The Hutton", priceCents: 40000 }),
];

const trip: Trip = {
  people: ["You", "Sam", "Jordan", "Priya"],
  budgetPerPersonUsd: 600,
  budgets: { Jordan: 400, Priya: 150 },
  constraints: [],
  missing: [],
};

Deno.test("the group flies the cheapest nonstop", () => {
  assertEquals(groupTravel(options)?.ref, "flight_1");
});

Deno.test("each person: same hotel, travel that fits their own budget", () => {
  const plans = individualPlans(trip, options);
  const by = Object.fromEntries(plans.map((p) => [p.name, p]));

  // Group budget $600: nonstop $300 + half the $400 hotel = $500. Fits.
  assertEquals(by.You.travel, "United · Nonstop");
  assertEquals(by.You.totalUsd, 500);
  assertEquals(by.You.note, undefined);

  // Jordan's $400: nonstop is $500 with the hotel. The 1-stop ($380) and the drive ($240)
  // both fit; the 1-stop is closest to the group's trip, so Jordan flies it.
  assertEquals(by.Jordan.budgetUsd, 400);
  assertEquals(by.Jordan.travel, "American · 1 stop");
  assertEquals(by.Jordan.totalUsd, 380);
  assertEquals(by.Jordan.note, "American · 1 stop keeps Jordan under their $400 budget");

  // Priya's $150: even driving is $240 with the hotel. Cheapest option, $90 over.
  assertEquals(by.Priya.travel, "Drive");
  assertEquals(by.Priya.overBudgetUsd, 90);
  assertEquals(by.Priya.note, "Nothing fits $150; Drive is the cheapest way there");

  // Everyone shares the hotel: half the $400 room.
  for (const p of plans) assertEquals(p.hotelShareUsd, 200);
});

Deno.test("no budgets anywhere: everyone takes the group's pick", () => {
  const plans = individualPlans(
    { ...trip, budgetPerPersonUsd: undefined, budgets: undefined },
    options,
  );
  for (const p of plans) {
    assertEquals(p.travel, "United · Nonstop");
    assertEquals(p.overBudgetUsd, undefined);
  }
});

Deno.test("a trip only reachable by land: the group drives", () => {
  const land = options.filter((o) => o.category === "hotel" || o.details.mode);
  assertEquals(groupTravel(land)?.title, "Drive");
});
