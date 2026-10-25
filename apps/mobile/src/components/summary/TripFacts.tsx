import { CalendarBlank, type Icon, MapPin, UsersThree, Wallet } from "phosphor-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { AvatarStack, Body, Card, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Trip } from "@/mocks/types";
import { colors, icon } from "@/theme";

function Row({
  icon: RowIcon,
  title,
  detail,
  right,
  first = false,
}: {
  icon: Icon;
  title: string;
  detail?: string;
  right?: ReactNode;
  first?: boolean;
}) {
  return (
    <View className={cn("flex-row items-center gap-3 py-3", !first && "border-t border-line")}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-raised">
        <RowIcon size={18} color={colors.accent} weight={icon.weight} />
      </View>
      <View className="flex-1">
        <Body className="font-body-semibold">{title}</Body>
        {detail ? <Muted>{detail}</Muted> : null}
      </View>
      {right}
    </View>
  );
}

// Who / where / when / budget, the four things the agent pulled out of the chat.
// `destination` is null until the group picks one of the suggested cities.
export function TripFacts({
  trip,
  destination,
  ideas,
}: {
  trip: Trip;
  destination: { city: string; region: string } | null;
  ideas: number;
}) {
  const names = trip.members.map((m) => m.name).join(", ");
  return (
    <Card className="py-1">
      <Row
        first
        icon={MapPin}
        title={destination ? `${destination.city}, ${destination.region}` : "Where: pick below"}
        detail={
          destination
            ? `From ${trip.origin.city} (${trip.origin.airport})`
            : `${ideas} ideas from the chat · from ${trip.origin.city} (${trip.origin.airport})`
        }
      />
      <Row icon={CalendarBlank} title={trip.dates.label} />
      <Row icon={Wallet} title={`$${trip.budgetPerPerson} per person`} detail="Flights + hotel" />
      <Row
        icon={UsersThree}
        title={`${trip.members.length} going`}
        detail={names}
        right={<AvatarStack members={trip.members} size="sm" max={5} />}
      />
    </Card>
  );
}
