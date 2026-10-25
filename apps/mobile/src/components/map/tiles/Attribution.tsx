import { useState } from "react";
import { Pressable, Text } from "react-native";
import { colors } from "@/theme";

// Esri requires "Powered by Esri" plus the service's own credits, visible on the map.
// The credits are the Dark Gray Canvas service's `copyrightText`.
export const TILE_CREDITS =
  "Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community";
const FULL = `Powered by Esri · ${TILE_CREDITS}`;

// Plain caption text along the map's bottom edge, under the flights row: always visible,
// never a box over the pins. One line that ends in "…" (like esri-leaflet's attribution);
// tap to read all of it. Anchored by its bottom, so the full credits grow upward, on the
// page color so they stay legible over the flights row.
export function Attribution({ bottom, inset }: { bottom: number; inset: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Map data: ${FULL}`}
      accessibilityHint={open ? "Collapses the map credits" : "Shows all map credits"}
      onPress={() => setOpen((o) => !o)}
      hitSlop={{ top: 12, bottom: 8 }}
      style={{
        position: "absolute",
        bottom,
        left: inset,
        right: inset,
        zIndex: open ? 40 : 0,
        backgroundColor: open ? colors.bg : undefined,
      }}
    >
      <Text numberOfLines={open ? undefined : 1} className="font-body text-caption text-faint">
        <Text className="font-body-medium text-muted">Powered by Esri</Text> · {TILE_CREDITS}
      </Text>
    </Pressable>
  );
}
