import { useState } from "react";
import { Pressable, Text } from "react-native";

// Esri requires "Powered by Esri" plus the service's own credits, visible on the map.
// The credits are the Dark Gray Canvas service's `copyrightText`.
export const TILE_CREDITS =
  "Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community";
const FULL = `Powered by Esri · ${TILE_CREDITS}`;

// One line that ends in "…" (like esri-leaflet's attribution); tap to read all of it.
export function Attribution({ top, maxWidth }: { top: number; maxWidth: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Map data: ${FULL}`}
      accessibilityHint={open ? "Collapses the map credits" : "Shows all map credits"}
      onPress={() => setOpen((o) => !o)}
      hitSlop={8}
      className="absolute right-2 rounded-lg border border-line bg-bg/85 px-2 py-1"
      style={{ top, maxWidth, zIndex: open ? 40 : 0 }}
    >
      <Text numberOfLines={open ? undefined : 1} className="font-body text-[10px] text-muted">
        <Text className="font-body-bold text-ink">Powered by Esri</Text> · {TILE_CREDITS}
      </Text>
    </Pressable>
  );
}
