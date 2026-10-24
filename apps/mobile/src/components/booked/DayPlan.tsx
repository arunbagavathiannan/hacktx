import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Badge, Card, Label, Muted } from "@/components/ui";
import type { PlaceCategory, Trip } from "@/mocks/types";
import { colors, icon } from "@/theme";
import { kindIcons } from "./icons";
import type { Day, Item, Itinerary, Stay } from "./itinerary";

function Row({
  kind,
  title,
  detail,
  price,
}: {
  kind: PlaceCategory | "flight";
  title: string;
  detail: string;
  price: string;
}) {
  const RowIcon = kindIcons[kind];
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-raised">
        <RowIcon size={20} color={colors.accent} weight={icon.weight} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-body-bold text-base text-ink">
          {title}
        </Text>
        <Muted numberOfLines={2}>{detail}</Muted>
      </View>
      <Text className="font-body-bold text-sm text-ink">{price}</Text>
    </View>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function itemRow(item: Item, trip: Trip) {
  if (item.kind === "flight") {
    const f = item.flight;
    return (
      <Row
        key={item.id}
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
      kind={p.category}
      title={p.name}
      detail={[p.hours, p.distanceLabel].filter(Boolean).join(" · ")}
      price={`${item.estimate ? "~" : ""}$${item.perPerson}`}
    />
  );
}

export function DayCard({ day, trip }: { day: Day; trip: Trip }) {
  return (
    <Card>
      <View className="gap-4">
        <Label>
          {day.weekday} · {day.label}
        </Label>
        {day.items.map((item) => itemRow(item, trip))}
      </View>
    </Card>
  );
}

export function StayCard({ stays, trip }: { stays: Stay[]; trip: Trip }) {
  return (
    <Card>
      <View className="gap-4">
        <Label>Where you're staying</Label>
        {stays.map((s) => (
          <Row
            key={s.place.id}
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
      </View>
    </Card>
  );
}

export function BudgetCard({ itinerary, trip }: { itinerary: Itinerary; trip: Trip }) {
  const share = Math.min(1, itinerary.perPerson / Math.max(1, trip.budgetPerPerson));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(share, { duration: 900 });
  }, [fill, share]);

  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const over = itinerary.perPerson - trip.budgetPerPerson;

  return (
    <Card>
      <View className="gap-3">
        <View className="flex-row items-start justify-between">
          <View className="gap-1">
            <Label>Per person</Label>
            <Text className="font-display text-4xl leading-[44px] text-ink">
              ~${itinerary.perPerson}
            </Text>
          </View>
          {itinerary.fitsBudget ? (
            <Badge label="Fits budget" tone="good" />
          ) : (
            <Badge label={`$${over} over budget`} tone="accent" />
          )}
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-raised">
          <Animated.View
            style={[
              {
                height: 8,
                borderRadius: 999,
                backgroundColor: itinerary.fitsBudget ? colors.good : colors.accent,
              },
              bar,
            ]}
          />
        </View>
        <Muted>
          ${trip.budgetPerPerson} budget from the chat · {trip.members.length} people
        </Muted>
      </View>
    </Card>
  );
}
