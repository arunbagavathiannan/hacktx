import { useState } from "react";
import { View } from "react-native";
import { colors } from "@/theme";

const DASH = 6;
const GAP = 8;

type Props = {
  // Color of whatever is *behind* the ticket, so the notches read as cut-outs.
  notchColor?: string;
  lineColor?: string;
};

// Ticket-stub tear line: a dashed hairline with a 20px notch bitten out of each edge.
// Put it directly inside the ticket surface, edge to edge (no horizontal padding), and give
// the ticket `overflow-hidden` so the outer half of each notch is clipped. Use it only inside
// a ticket, between the head and the stub (DESIGN.md, "perforation").
export function Perforation({ notchColor = colors.bg, lineColor = colors.line }: Props) {
  const [dashes, setDashes] = useState(0);
  const dash = { width: DASH, backgroundColor: lineColor };

  return (
    <View className="h-5 flex-row items-center" accessibilityElementsHidden>
      <View className="-ml-2.5 h-5 w-5 rounded-full" style={{ backgroundColor: notchColor }} />
      <View
        className="flex-1 flex-row justify-between px-2"
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width - 16; // px-2 on both sides
          setDashes(Math.max(0, Math.floor((width + GAP) / (DASH + GAP))));
        }}
      >
        {Array.from({ length: dashes }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static decoration, never reorders
          <View key={i} className="h-[2px] rounded-full" style={dash} />
        ))}
      </View>
      <View className="-mr-2.5 h-5 w-5 rounded-full" style={{ backgroundColor: notchColor }} />
    </View>
  );
}
