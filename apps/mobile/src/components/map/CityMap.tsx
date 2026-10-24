import { useMemo, useState } from "react";
import { Image, type LayoutChangeEvent, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { Member, Place } from "@/mocks/types";
import { fitBounds, project, TILE } from "./geo";
import { PlacePin } from "./PlacePin";

// Styled city map with our own pins. Tiles: CARTO "dark matter" (no API key, attribution
// required). Swap for react-native-maps + Google once we have a Maps key.
const tileUrl = (z: number, x: number, y: number) =>
  `https://${"abcd"[(x + y) % 4]}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}@2x.png`;

type Props = {
  places: Place[];
  members: Member[];
  picks: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Space covered by overlays (top bar, bottom bar) so pins don't fit underneath them.
  insets?: { top: number; bottom: number };
};

export function CityMap({ places, members, picks, selectedId, onSelect, insets }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const view = useMemo(() => {
    const top = insets?.top ?? 0;
    const bottom = insets?.bottom ?? 0;
    const usableHeight = size.height - top - bottom;
    if (!size.width || usableHeight <= 0 || places.length === 0) return null;
    const { zoom, center } = fitBounds(places, size.width, usableHeight);
    // Shift so the fitted box sits between the overlays, not under them.
    const originX = center.x - size.width / 2;
    const originY = center.y - top - usableHeight / 2;
    const tiles: { key: string; z: number; x: number; y: number; left: number; top: number }[] = [];
    const n = 2 ** zoom;
    for (
      let tx = Math.floor(originX / TILE);
      tx <= Math.floor((originX + size.width) / TILE);
      tx++
    ) {
      for (
        let ty = Math.floor(originY / TILE);
        ty <= Math.floor((originY + size.height) / TILE);
        ty++
      ) {
        if (ty < 0 || ty >= n) continue;
        const wrapped = ((tx % n) + n) % n;
        tiles.push({
          key: `${zoom}/${tx}/${ty}`,
          z: zoom,
          x: wrapped,
          y: ty,
          left: tx * TILE - originX,
          top: ty * TILE - originY,
        });
      }
    }
    const pins = places.map((p) => {
      const pt = project(p, zoom);
      return { place: p, x: pt.x - originX, y: pt.y - originY };
    });
    return { tiles, pins };
  }, [size, places, insets?.top, insets?.bottom]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  return (
    <View className="flex-1 overflow-hidden bg-bg" onLayout={onLayout}>
      {view ? (
        <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1 }}>
          {view.tiles.map((t) => (
            <Image
              key={t.key}
              source={{ uri: tileUrl(t.z, t.x, t.y) }}
              style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE }}
            />
          ))}
          {/* Warm tint so the basemap matches our palette. */}
          <View pointerEvents="none" className="absolute inset-0 bg-accent/5" />
          {view.pins.map(({ place, x, y }, i) => (
            <PlacePin
              key={place.id}
              place={place}
              x={x}
              y={y}
              index={i}
              picked={picks.includes(place.id)}
              selected={selectedId === place.id}
              pickers={place.pickedBy.map((id) => byId.get(id)).filter((m): m is Member => !!m)}
              onPress={() => onSelect(place.id)}
            />
          ))}
        </Animated.View>
      ) : null}
      <Text
        className="absolute right-2 font-body text-[10px] text-faint"
        style={{ bottom: (insets?.bottom ?? 0) + 6 }}
      >
        © OpenStreetMap contributors © CARTO
      </Text>
    </View>
  );
}
