import { Car } from "phosphor-react-native";
import { Text, View } from "react-native";
import { DRIVE_MOCK } from "@/lib/pricing";
import { colors } from "@/theme";

type Props = {
  from: string; // "Austin"
  hours?: number; // one way
  miles?: number; // covered by `perPerson` (both ways for "round trip")
  perPerson: number; // gas, split across the group
  people: number;
  // What `perPerson` covers: the whole trip (City view, matches the footer and booked
  // screen) or this one leg (Route view).
  scope: "round trip" | "each way";
};

// Shown instead of flight options when the group drives. Gas is an estimate from
// DRIVE_MOCK, so the price always reads "~" and "gas est.".
export function DriveCard({ from, hours, miles, perPerson, people, scope }: Props) {
  const title = [`Drive from ${from}`, hours ? `~${hours}h` : null, "split gas"]
    .filter(Boolean)
    .join(" · ");
  const detail = [
    scope,
    miles ? `${miles} mi` : null,
    `${DRIVE_MOCK.mpg} mpg at $${DRIVE_MOCK.gasPerGallon.toFixed(2)}/gal`,
    `${people} ways`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View
      accessibilityLabel={`${title}. About $${perPerson} each in gas, ${scope}, estimated.`}
      className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface/95 px-3.5 py-3"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
        <Car size={18} color={colors.accent} weight="fill" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-body-bold text-sm text-ink">
          {title}
        </Text>
        <Text numberOfLines={1} className="font-body text-xs text-muted">
          <Text className="font-body-bold text-ink">~${perPerson} each</Text> · gas est. · {detail}
        </Text>
      </View>
    </View>
  );
}
