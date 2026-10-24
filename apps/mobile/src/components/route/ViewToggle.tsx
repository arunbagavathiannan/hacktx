import { Pressable, Text, View } from "react-native";

export type MapView = "route" | "city";

const OPTIONS: Array<{ id: MapView; label: string }> = [
  { id: "route", label: "Route" },
  { id: "city", label: "City" },
];

// "Route | City" segmented control at the top of the map screen.
export function ViewToggle({
  value,
  onChange,
}: {
  value: MapView;
  onChange: (v: MapView) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-full border border-line bg-surface p-1"
    >
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.id)}
            className={`flex-1 items-center rounded-full py-1.5 active:opacity-80 ${
              active ? "bg-raised" : ""
            }`}
          >
            <Text className={`font-body-semibold text-sm ${active ? "text-ink" : "text-muted"}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
