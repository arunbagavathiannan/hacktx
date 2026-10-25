import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Heading, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PlaceCategory, Trip } from "@/mocks/types";
import { colors, icon } from "@/theme";
import { kindIcons } from "./icons";
import type { Day, Item, Itinerary, Stay } from "./itinerary";

// The itinerary under the share card: unboxed lists with hairline dividers (DESIGN.md
// "Lists"). No cards, no icon wells; the kind icon sits bare in `muted`.

const TABULAR = { fontVariant: ["tabular-nums" as const] };

const WEEKDAY_NAMES: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

function Row({
  kind,
  title,
  detail,
  price,
  first,
}: {
  kind: PlaceCategory | "flight";
  title: string;
  detail: string;
  price: string;
  first: boolean;
}) {
  const RowIcon = kindIcons[kind];
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${detail}. ${price === "incl." ? "Included" : `${price} each`}`}
      className={cn("flex-row items-start gap-3 py-3", !first && "border-t border-line")}
    >
      <View className="pt-0.5">
        <RowIcon size={18} color={colors.muted} weight={icon.weight} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-body-semibold text-body text-ink">
          {title}
        </Text>
        <Muted numberOfLines={2}>{detail}</Muted>
      </View>
      <Text className="font-body-bold text-body text-ink" style={TABULAR}>
        {price}
      </Text>
    </View>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function itemRow(item: Item, trip: Trip, first: boolean) {
  if (item.kind === "flight") {
    const f = item.flight;
    return (
      <Row
        key={item.id}
        first={first}
        kind="flight"
        title={`${f.airline} · ${trip.origin.airport} → ${trip.destination.city}`}
        detail={`${f.depart} → ${f.arrive} · ${f.stops === 0 ? "Nonstop" : plural(f.stops, "stop")}`}
        price={`$${item.perPerson}`}
      />
    );
  }
  if (item.kind === "checkin") {
    return (
      <Row
        key={item.id}
        first={first}
        kind="hotel"
        title={`Check in early · ${item.place.name}`}
        detail="Extra night so you have a bed when you land. Included in the stay total."
        price="incl."
      />
    );
  }
  const p = item.place;
  return (
    <Row
      key={item.id}
      first={first}
      kind={p.category}
      title={p.name}
      detail={[p.hours, p.distanceLabel].filter(Boolean).join(" · ")}
      price={`${item.estimate ? "~" : ""}$${item.perPerson}`}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Heading accessibilityRole="header" className="pb-1 font-display-medium">
        {title}
      </Heading>
      {children}
    </View>
  );
}

export function DaySection({ day, trip }: { day: Day; trip: Trip }) {
  return (
    <Section title={`${WEEKDAY_NAMES[day.weekday] ?? day.weekday}, ${day.label}`}>
      {day.items.map((item, i) => itemRow(item, trip, i === 0))}
    </Section>
  );
}

export function StaySection({ stays, trip }: { stays: Stay[]; trip: Trip }) {
  return (
    <Section title="Where you're staying">
      {stays.map((s, i) => (
        <Row
          key={s.place.id}
          first={i === 0}
          kind="hotel"
          title={s.place.name}
          detail={[
            plural(s.nights, "night"),
            s.extraNights ? `incl. ${plural(s.extraNights, "early night")}` : null,
            `${plural(s.rooms, "room")}${s.sleepsPerRoom ? ` (sleeps ${s.sleepsPerRoom})` : ""}`,
            `$${s.nightly}/night`,
            `split ${trip.members.length} ways`,
          ]
            .filter(Boolean)
            .join(" · ")}
          price={`$${s.perPerson}`}
        />
      ))}
    </Section>
  );
}

// The budget in one line: "~$382 each · $18 under the $400 budget". Under budget is the one
// success here, so only "$18 under" is green. Over budget is a status that has to be seen, so
// it gets the boxed accent badge treatment in the `bad` color.
export function BudgetLine({ itinerary, trip }: { itinerary: Itinerary; trip: Trip }) {
  const diff = trip.budgetPerPerson - itinerary.perPerson;
  const each = `~$${itinerary.perPerson} each`;

  if (diff < 0) {
    return (
      <View
        accessible
        accessibilityLabel={`${each}, $${-diff} over the $${trip.budgetPerPerson} budget`}
        className="flex-row flex-wrap items-center gap-2"
      >
        <Text className="font-body-bold text-body text-ink" style={TABULAR}>
          {each}
        </Text>
        {/* Same box as ui/Badge variant="accent"; Badge has no `bad` tone yet. */}
        <View className="rounded-md bg-bad/15 px-2 py-0.5">
          <Text className="font-body-semibold text-caption text-bad" style={TABULAR}>
            ${-diff} over the ${trip.budgetPerPerson} budget
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Text className="font-body text-small text-muted" style={TABULAR}>
      <Text className="font-body-bold text-ink">{each}</Text>
      {" · "}
      {diff === 0 ? (
        `right on the $${trip.budgetPerPerson} budget`
      ) : (
        <>
          <Text className="font-body-semibold text-good">${diff} under</Text> the $
          {trip.budgetPerPerson} budget
        </>
      )}
    </Text>
  );
}
