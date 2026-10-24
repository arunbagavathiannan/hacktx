import { AirplaneTilt, Bed, ForkKnife, Martini, Ticket } from "phosphor-react-native";
import { colors, icon } from "@/theme";
import type { ItemKind } from "./plan";

const icons = {
  flight: AirplaneTilt,
  hotel: Bed,
  activity: Ticket,
  food: ForkKnife,
  nightlife: Martini,
} as const;

export const kindLabel: Record<ItemKind, string> = {
  flight: "Flight",
  hotel: "Stay",
  activity: "Main event",
  food: "Food",
  nightlife: "Night out",
};

export function KindIcon({
  kind,
  size = icon.size,
  color = colors.accent,
}: {
  kind: ItemKind;
  size?: number;
  color?: string;
}) {
  const Icon = icons[kind];
  return <Icon size={size} color={color} weight={icon.weight} />;
}
