import { CalendarBlank, type Icon, MapPin, UsersThree, Wallet } from "phosphor-react-native";
import { Text, View } from "react-native";
import { AvatarStack, Label } from "@/components/ui";
import { chat, members, trip } from "@/mocks";
import type { Fact, FactKind } from "@/mocks/summary";
import { colors, icon } from "@/theme";
import { QuoteLine } from "./QuoteLine";

const icons: Record<FactKind, Icon> = {
  who: UsersThree,
  when: CalendarBlank,
  budget: Wallet,
  from: MapPin,
};

// One thing Huddle understood (who / when / budget / from) plus the chat lines that prove it.
export function FactRow({ fact }: { fact: Fact }) {
  const FactIcon = icons[fact.kind];
  // Missing ids or senders are dropped, so a bad citation never crashes the screen.
  const quoted = fact.quotes.flatMap((id) => {
    const message = chat.find((m) => m.id === id);
    const sender = message && members.find((p) => p.id === message.from);
    return message && sender ? [{ message, sender }] : [];
  });

  const sub =
    fact.kind === "who"
      ? trip.members.map((m) => m.name).join(", ")
      : quoted.length
        ? null
        : fact.note;

  return (
    <View className="flex-row items-start gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-raised">
        <FactIcon size={18} color={colors.accent} weight={icon.weight} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <Label>{fact.label}</Label>
          {fact.kind === "who" ? <AvatarStack members={trip.members} size="sm" max={5} /> : null}
        </View>
        <Text className="font-body-semibold text-base text-ink">{fact.value}</Text>
        {sub ? <Text className="font-body text-sm leading-5 text-muted">{sub}</Text> : null}
        {quoted.length > 0 ? (
          <View className="mt-2 gap-2 border-l border-line pl-3">
            {quoted.map(({ message, sender }) => (
              <QuoteLine key={message.id} message={message} sender={sender} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
