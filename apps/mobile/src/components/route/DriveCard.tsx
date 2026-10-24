import { Car } from "phosphor-react-native";
import { Text, View } from "react-native";
import { DRIVE_MOCK } from "@/lib/pricing";
import { colors } from "@/theme";

type Props = {
  from: string; // "Austin"
  hours?: number;
  miles?: number;
  perPerson: number; // gas, split across the group
  people: number;
};

// Shown instead of flight options when the group drives a leg.
export function DriveCard({ from, hours, miles, perPerson, people }: Props) {
  const title = [`Drive from ${from}`, hours ? `~${hours}h` : null, "split gas"]
    .filter(Boolean)
    .join(" · ");
  const detail = [
    miles ? `${miles} mi` : null,
    `${DRIVE_MOCK.mpg} mpg at $${DRIVE_MOCK.gasPerGallon.toFixed(2)}/gal`,
    `${people} ways`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View
      accessibilityLabel={`${title}, about $${perPerson} each in gas`}
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
          <Text className="font-body-bold text-ink">${perPerson} each</Text> · {detail}
        </Text>
      </View>
    </View>
  );
}
