import type { ReactNode } from "react";
import { View } from "react-native";
import { AvatarStack, Heading, Label, Muted } from "@/components/ui";
import type { TripBrief } from "@/mocks/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86_400_000;

// "2026-11-13".."2026-11-15" -> "Nov 13–15" + "Fri to Sun · 2 nights". Falls back to the
// brief's own label if the dates don't parse.
export function shortDates(dates: TripBrief["dates"]): { range: string; detail: string | null } {
  const s = new Date(`${dates.start}T00:00:00Z`);
  const e = new Date(`${dates.end}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
    return { range: dates.label, detail: null };
  }
  const sm = MONTHS[s.getUTCMonth()];
  const em = MONTHS[e.getUTCMonth()];
  const range =
    sm === em
      ? `${sm} ${s.getUTCDate()}–${e.getUTCDate()}`
      : `${sm} ${s.getUTCDate()} – ${em} ${e.getUTCDate()}`;
  const nights = Math.round((e.getTime() - s.getTime()) / DAY_MS);
  const days = `${DAYS[s.getUTCDay()]} to ${DAYS[e.getUTCDay()]}`;
  return {
    range,
    detail: nights > 0 ? `${days} · ${nights} night${nights === 1 ? "" : "s"}` : days,
  };
}

// One cell of the 2x2 grid: a sentence-case label, the value in the headline role, and
// one supporting line (or the avatars, for Who).
function Fact({
  label,
  value,
  detail,
  spoken,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  spoken: string;
}) {
  return (
    <View accessible accessibilityLabel={`${label}: ${spoken}`} className="flex-1 gap-1">
      <Label>{label}</Label>
      <Heading numeric numberOfLines={1} className="font-display-medium">
        {value}
      </Heading>
      {typeof detail === "string" ? <Muted numberOfLines={2}>{detail}</Muted> : detail}
    </View>
  );
}

// The ticket's head: where / when / budget / who, as the agent read them from the chat.
// `destination` is null until the group picks one of the suggested cities. Rendered inside
// the Summary ticket (no surface of its own).
export function TripFacts({
  trip,
  destination,
  ideas,
}: {
  trip: TripBrief;
  destination: { city: string; region: string } | null;
  ideas: number;
}) {
  const from = `From ${trip.origin.city} (${trip.origin.airport})`;
  const when = shortDates(trip.dates);
  const names = trip.members.map((m) => m.name).join(", ");
  return (
    <View className="gap-5 px-5 pb-4 pt-5">
      <View className="flex-row gap-4">
        <Fact
          label="Where"
          value={destination ? destination.city : `${ideas} ideas`}
          detail={destination ? `${destination.region} · ${trip.origin.airport}` : from}
          spoken={
            destination
              ? `${destination.city}, ${destination.region}. ${from}`
              : `${ideas} ideas, the group picks next. ${from}`
          }
        />
        <Fact
          label="When"
          value={when.range}
          detail={when.detail ?? undefined}
          spoken={trip.dates.label}
        />
      </View>
      <View className="flex-row gap-4">
        <Fact
          label="Budget"
          value={`$${trip.budgetPerPerson}`}
          detail="Each, flights + hotel"
          spoken={`$${trip.budgetPerPerson} per person, flights and hotel`}
        />
        <Fact
          label="Who"
          value={`${trip.members.length} going`}
          detail={
            <View className="pt-0.5">
              <AvatarStack members={trip.members} size="sm" max={5} />
            </View>
          }
          spoken={`${trip.members.length} going: ${names}`}
        />
      </View>
    </View>
  );
}
