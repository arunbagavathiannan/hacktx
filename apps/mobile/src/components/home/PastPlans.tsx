import { View } from "react-native";
import { Body, Card, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";
import { colors, icon } from "@/theme";
import { pastTrips } from "./pastTrips";

// Trips the group already took. Read-only for now (no detail screen).
export function PastPlans() {
  if (pastTrips.length === 0) {
    return (
      <Card>
        <Muted>Plans you finish show up here.</Muted>
      </Card>
    );
  }

  return (
    <Card className="py-1">
      {pastTrips.map((t, i) => {
        const TripIcon = t.icon;
        return (
          <View
            key={t.id}
            accessible
            accessibilityLabel={`${t.title}, ${t.when}, ${t.people} went, $${t.perPerson} each`}
            className={cn("flex-row items-center gap-3 py-3", i > 0 && "border-t border-line")}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-raised">
              <TripIcon size={20} color={colors.muted} weight={icon.weight} />
            </View>
            <View className="flex-1">
              <Body className="font-body-semibold">{t.title}</Body>
              <Muted>
                {t.when} · {t.people} went
              </Muted>
            </View>
            <Muted className="font-body-semibold">${t.perPerson} each</Muted>
          </View>
        );
      })}
    </Card>
  );
}
