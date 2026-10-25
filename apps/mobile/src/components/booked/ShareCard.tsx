import { LinearGradient } from "expo-linear-gradient";
import type { ComponentRef, Ref } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AvatarStack, Perforation } from "@/components/ui";
import type { PlaceCategory, Trip } from "@/mocks/types";
import { colors } from "@/theme";
import { kindIcons } from "./icons";
import {
  budgetPhrase,
  eventTime,
  type Itinerary,
  shortDates,
  shortName,
  shortTime,
} from "./itinerary";

// The card sits in a solid frame so the captured PNG has no transparent corners (chat apps
// fill transparency with black, and the ticket notches need a background to read as cutouts).
// Frame is 4:5 like a portrait chat image; captured at 1080x1350 (see share.ts).
export const FRAME_WIDTH = 360;
export const FRAME_HEIGHT = 450;
const CARD_WIDTH = 336;
const CARD_HEIGHT = 420;
const SKY = 158;
const MAX_ROWS = 4;
const TABULAR = { fontVariant: ["tabular-nums" as const] };
// Room for the city name: card width minus the px-6 padding on both sides.
const TITLE_WIDTH = CARD_WIDTH - 48;

// Big for short names ("Denver"), smaller so long ones ("New Orleans") still fit on one line.
// 0.62em is roughly Bricolage Grotesque Bold's average letter width.
function cityTitleStyle(city: string) {
  const fontSize = Math.min(52, Math.floor(TITLE_WIDTH / (city.length * 0.62)));
  return { fontSize, lineHeight: Math.round(fontSize * 1.08) };
}

type Row = { key: string; kind: PlaceCategory | "flight"; title: string; when: string };

function rowsFor(it: Itinerary): Row[] {
  const rows: Row[] = [];
  const items = it.days.flatMap((d) => d.items.map((item) => ({ item, weekday: d.weekday })));
  for (const { item } of items) {
    if (item.kind !== "flight") continue;
    const { flight } = item;
    rows.push({
      key: item.id,
      kind: "flight",
      title: `${flight.airline}${flight.stops === 0 ? " · nonstop" : ""}`,
      when: shortTime(flight.depart) ?? flight.depart,
    });
  }
  for (const stay of it.stays) {
    rows.push({
      key: stay.place.id,
      kind: "hotel",
      title: shortName(stay.place.name),
      when: `${stay.nights} night${stay.nights === 1 ? "" : "s"}`,
    });
  }
  for (const { item, weekday } of items) {
    if (item.kind !== "place") continue;
    rows.push({
      key: item.id,
      kind: item.place.category,
      title: shortName(item.place.name),
      when: eventTime(item.place) ?? weekday,
    });
  }
  return rows;
}

// Sunset over the Front Range: a pale sun dropping behind two ridgelines.
function Horizon() {
  return (
    <Svg
      width={CARD_WIDTH}
      height={70}
      viewBox={`0 0 ${CARD_WIDTH} 70`}
      style={{ position: "absolute", bottom: 0, left: 0 }}
    >
      <Circle cx={244} cy={44} r={26} fill={colors.ink} opacity={0.92} />
      <Path
        d="M0 46 L38 30 L70 40 L112 16 L150 36 L188 24 L226 40 L262 28 L300 42 L336 30 L336 70 L0 70 Z"
        fill={colors["accent-soft"]}
      />
      <Path
        d="M0 58 L46 44 L88 54 L132 38 L176 52 L214 46 L258 58 L298 48 L336 56 L336 70 L0 70 Z"
        fill={colors.surface}
      />
    </Svg>
  );
}

type Props = { trip: Trip; itinerary: Itinerary; ref?: Ref<ComponentRef<typeof View>> };

export function ShareCard({ trip, itinerary, ref }: Props) {
  const all = rowsFor(itinerary);
  const rows = all.length > MAX_ROWS ? all.slice(0, MAX_ROWS - 1) : all;
  const more = all.length - rows.length;
  const budget = budgetPhrase(itinerary, trip);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        className="overflow-hidden rounded-[28px] bg-surface"
      >
        <View style={{ height: SKY }}>
          <LinearGradient
            colors={[colors.gold, colors.accent, colors["accent-soft"]]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Horizon />
          <View className="px-6 pt-5">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="font-display text-bg"
              style={cityTitleStyle(trip.destination.city)}
            >
              {trip.destination.city}
            </Text>
            <Text className="font-body-semibold text-small text-bg/70" style={TABULAR}>
              {trip.sourceChat.name} · {shortDates(trip)}
            </Text>
          </View>
        </View>

        <Perforation notchColor={colors.bg} />

        <View className="flex-1 gap-2 px-6 pt-1">
          {rows.map((row) => {
            const RowIcon = kindIcons[row.kind];
            return (
              <View key={row.key} className="h-7 flex-row items-center gap-3">
                <RowIcon size={18} color={colors.accent} weight="regular" />
                <Text numberOfLines={1} className="flex-1 font-body-semibold text-small text-ink">
                  {row.title}
                </Text>
                <Text className="font-body-medium text-caption text-muted" style={TABULAR}>
                  {row.when}
                </Text>
              </View>
            );
          })}
          {more > 0 ? (
            <Text className="pl-[30px] font-body-medium text-caption text-faint" style={TABULAR}>
              +{more} more
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-end justify-between border-t border-line px-6 pb-3 pt-3">
          <View className="gap-1.5">
            <AvatarStack members={trip.members} size="sm" max={5} />
            <Text className="font-body-medium text-caption text-muted" style={TABULAR}>
              {trip.members.length} going
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-display text-display text-ink" style={TABULAR}>
              ~${itinerary.perPerson}
            </Text>
            <Text className="font-body-medium text-caption text-muted" style={TABULAR}>
              each{budget ? ` · ${budget}` : ""}
            </Text>
          </View>
        </View>

        <View className="items-center bg-raised py-2">
          <Text className="font-body-medium text-caption text-muted">
            Planned with <Text className="font-display text-ink">Huddle</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
