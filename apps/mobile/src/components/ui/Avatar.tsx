import { Text, View } from "react-native";
import type { Member } from "@/mocks/types";

type Size = "sm" | "md";

const sizes: Record<Size, { box: string; text: string }> = {
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-10 w-10", text: "text-sm" },
};

export function Avatar({ member, size = "md" }: { member: Member; size?: Size }) {
  const s = sizes[size];
  return (
    <View
      accessibilityLabel={member.name}
      className={`${s.box} items-center justify-center rounded-full border-2 border-bg`}
      style={{ backgroundColor: member.color }}
    >
      <Text className={`font-body-bold text-bg ${s.text}`}>{member.name.slice(0, 1)}</Text>
    </View>
  );
}

// Overlapping avatars, e.g. who's in the trip or who picked a place.
export function AvatarStack({
  members,
  size = "md",
  max = 4,
}: {
  members: Member[];
  size?: Size;
  max?: number;
}) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <View className="flex-row items-center">
      {shown.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar member={m} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <Text className="ml-2 font-body-semibold text-sm text-muted">+{extra}</Text>
      ) : null}
    </View>
  );
}
