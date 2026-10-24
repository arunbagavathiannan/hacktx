import { Link } from "expo-router";
import { MapPin } from "phosphor-react-native";
import { Text, View } from "react-native";
import { Body, Button, Card, Label, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import { colors, icon } from "@/theme";
import { KindIcon, kindLabel } from "./icons";
import type { PlanSummary } from "./plan";

// "What's in the plan": every pick as a row, then the per-person total against the budget.
export function PlanList({ summary }: { summary: PlanSummary }) {
  const { items, total, budget } = summary;

  if (items.length === 0) {
    return (
      <Card className="items-center gap-3 py-8">
        <MapPin size={28} color={colors.faint} weight={icon.weight} />
        <Body className="text-center text-muted">Nothing in the plan yet.</Body>
        <Link href="/plan/map" asChild>
          <Button label="Pick from the map" variant="secondary" className="h-11 self-stretch" />
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      {items.map((item, i) => (
        <View
          key={item.id}
          className={cn("flex-row items-center gap-3 px-4 py-3.5", i > 0 && "border-t border-line")}
        >
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-raised">
            <KindIcon kind={item.kind} />
          </View>
          <View className="flex-1 gap-0.5">
            <Label className="text-[10px]">{kindLabel[item.kind]}</Label>
            <Text className="font-body-bold text-base text-ink" numberOfLines={1}>
              {item.title}
            </Text>
            <Muted numberOfLines={1}>{item.detail}</Muted>
          </View>
          <View className="items-end">
            <Text className="font-body-bold text-base text-ink">{item.price}</Text>
            {item.perPerson !== null ? <Muted className="text-xs">each</Muted> : null}
          </View>
        </View>
      ))}
      <Budget total={total} budget={budget} />
    </Card>
  );
}

function Budget({ total, budget }: { total: number; budget: number }) {
  const fits = total <= budget;
  const pct = Math.min(total / budget, 1) * 100;
  return (
    <View className="gap-3 border-t border-line px-4 pb-4 pt-3.5">
      <View className="flex-row items-end justify-between">
        <View>
          <Label className="text-[10px]">Per person</Label>
          <Text className="font-display text-3xl leading-9 text-ink">${total}</Text>
        </View>
        <View className="items-end pb-1">
          <Text className={cn("font-body-bold text-sm", fits ? "text-good" : "text-gold")}>
            {fits ? `$${budget - total} under budget` : `$${total - budget} over budget`}
          </Text>
          <Muted className="text-xs">${budget} budget from the chat</Muted>
        </View>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-raised">
        <View
          className={cn("h-full rounded-full", fits ? "bg-accent" : "bg-gold")}
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}
