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

const TABULAR = { fontVariant: ["tabular-nums" as const] };

// Shown instead of flight options when the group drives. Gas is an estimate from
// DRIVE_MOCK, so the price always reads "~" and "gas". Laid out like a list row: bare
// icon, what it is, then the price on the right.
export function DriveCard({ from, hours, miles, perPerson, people, scope }: Props) {
  const title = [`Drive from ${from}`, hours ? `~${hours}h` : null].filter(Boolean).join(" · ");
  const detail = [
    miles ? `${miles} mi ${scope}` : scope,
    `${people} ways`,
    `${DRIVE_MOCK.mpg} mpg at $${DRIVE_MOCK.gasPerGallon.toFixed(2)}/gal`,
  ].join(" · ");
  return (
    <View
      accessible
      accessibilityLabel={`${title}. About $${perPerson} each in gas, ${scope}, estimated.`}
      className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3"
    >
      <Car size={20} color={colors.muted} weight="regular" />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-body-semibold text-small text-ink" style={TABULAR}>
          {title}
        </Text>
        <Text numberOfLines={1} className="font-body text-caption text-muted" style={TABULAR}>
          {detail}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="font-body-bold text-small text-ink" style={TABULAR}>
          ~${perPerson}
        </Text>
        <Text className="font-body text-caption text-muted">gas each</Text>
      </View>
    </View>
  );
}
