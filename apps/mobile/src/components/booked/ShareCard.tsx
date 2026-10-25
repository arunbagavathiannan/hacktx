import { LinearGradient } from "expo-linear-gradient";
import { ChatsCircle } from "phosphor-react-native";
import type { ComponentRef, Ref } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AvatarStack } from "@/components/ui";
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

// Ticket-stub tear line with notches on both edges.
function Perforation() {
  return (
    <View className="h-5 flex-row items-center">
      <View className="-ml-2.5 h-5 w-5 rounded-full bg-bg" />
      <View className="flex-1 flex-row justify-between px-2">
        {Array.from({ length: 22 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static decoration, never reorders
          <View key={i} className="h-[2px] w-[6px] rounded-full bg-line" />
        ))}
      </View>
      <View className="-mr-2.5 h-5 w-5 rounded-full bg-bg" />
    </View>
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
          <View className="flex-row items-start justify-between px-6 pt-5">
            <View className="gap-0.5">
              <Text className="font-body-bold text-[11px] uppercase tracking-[2.5px] text-bg/70">
                {trip.sourceChat.name} · {shortDates(trip)}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="font-display text-bg"
                style={cityTitleStyle(trip.destination.city)}
              >
                {trip.destination.city}
              </Text>
            </View>
            <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-bg/15">
              <ChatsCircle size={16} color={colors.bg} weight="fill" />
            </View>
          </View>
        </View>

        <Perforation />

        <View className="flex-1 gap-2 px-6 pt-1">
          {rows.map((row) => {
            const RowIcon = kindIcons[row.kind];
            return (
              <View key={row.key} className="h-7 flex-row items-center gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-accent-soft">
                  <RowIcon size={15} color={colors.accent} weight="regular" />
                </View>
                <Text numberOfLines={1} className="flex-1 font-body-bold text-[14px] text-ink">
                  {row.title}
                </Text>
                <Text className="font-body-semibold text-xs text-muted">{row.when}</Text>
              </View>
            );
          })}
          {more > 0 ? (
            <Text className="pl-10 font-body-semibold text-xs text-faint">+{more} more</Text>
          ) : null}
        </View>

        <View className="flex-row items-end justify-between border-t border-line px-6 pb-3 pt-3">
          <View className="gap-1.5">
            <AvatarStack members={trip.members} size="sm" max={5} />
            <Text className="font-body-semibold text-xs text-muted">
              {trip.members.length} going
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-display text-[30px] leading-[34px] text-ink">
              ~${itinerary.perPerson}
            </Text>
            <Text className="font-body-semibold text-xs text-muted">
              each{budget ? ` · ${budget}` : ""}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-1.5 bg-raised py-2">
          <ChatsCircle size={12} color={colors.accent} weight="fill" />
          <Text className="font-body-bold text-[11px] tracking-wide text-muted">
            Planned with Huddle
          </Text>
        </View>
      </View>
    </View>
  );
}
