import { Text, View } from "react-native";
import { Body, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import { pastTrips } from "./pastTrips";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

// Trips the group already took. Read-only for now (no detail screen). An unboxed list with
// hairline dividers (DESIGN.md "Lists").
export function PastPlans() {
  if (pastTrips.length === 0) {
    return <Muted className="py-3">Plans you finish show up here.</Muted>;
  }

  return (
    <View>
      {pastTrips.map((t, i) => (
        <View
          key={t.id}
          accessible
          accessibilityLabel={`${t.title}, ${t.when}, ${t.people} went, $${t.perPerson} each`}
          className={cn("flex-row items-center gap-3 py-3", i > 0 && "border-t border-line")}
        >
          <View className="flex-1">
            <Body className="font-body-semibold">{t.title}</Body>
            <Muted numeric>
              {t.when} · {t.people} went
            </Muted>
          </View>
          <Text className="font-body-bold text-body text-ink" style={TABULAR}>
            ${t.perPerson}
            <Text className="font-body text-small text-muted"> each</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}
