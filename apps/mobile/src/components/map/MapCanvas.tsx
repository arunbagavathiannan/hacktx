import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";
import type { Member, Place } from "@/mocks/types";
import { colors } from "@/theme";
import { PlaceCallout } from "./PlaceCallout";
import { PIN_SIZE, PlacePin } from "./PlacePin";
import { fitProjection, type Insets, kmBetween, type Size, spreadPins } from "./projection";
import { TILE_ATTRIBUTION, TileLayer } from "./tiles/TileLayer";

type Props = {
  places: Place[]; // pins to show (already filtered)
  boundsFrom: Place[]; // what the map fits to; keep it the full list so filters don't jump
  members: Member[];
  pickedIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  insets: Insets; // room for overlays (chips on top, flights row at the bottom)
  revealed: boolean; // pins drop in once the globe hands off
  // The selected pin shows a small callout with these actions. Tapping empty map dismisses it.
  onTogglePick?: (id: string) => void;
  onOpenDetails?: (id: string) => void;
  onDismiss?: () => void;
};

// Places farther than this from the middle of the group become edge pins pointing off-map,
// so one far-away pick (Red Rocks) doesn't shrink the whole city to a corner.
const CORE_RADIUS_KM = 12;
const EDGE_MARGIN = 48;
// Above this the callout would sit under the filter chips, so it flips below the pin.
const CHIPS_HEIGHT = 56;

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

// Real streets from CARTO's OpenStreetMap tiles, fitted to the places, with our own pins on
// top. The same props would drive a react-native-maps <MapView> with <Marker>s later.
export function MapCanvas({
  places,
  boundsFrom,
  members,
  pickedIds,
  selectedId,
  onSelect,
  insets,
  revealed,
  onTogglePick,
  onOpenDetails,
  onDismiss,
}: Props) {
  const [size, setSize] = useState<Size | null>(null);

  const core = useMemo(() => {
    const center = {
      lat: median(boundsFrom.map((p) => p.lat)),
      lng: median(boundsFrom.map((p) => p.lng)),
    };
    const near = boundsFrom.filter((p) => kmBetween(p, center) <= CORE_RADIUS_KM);
    return new Set((near.length > 0 ? near : boundsFrom).map((p) => p.id));
  }, [boundsFrom]);

  const proj = useMemo(() => {
    if (!size) return null;
    const fit = boundsFrom.filter((p) => core.has(p.id));
    return fitProjection(fit.length > 0 ? fit : [{ lat: 39.7392, lng: -104.9903 }], size, insets);
  }, [size, boundsFrom, core, insets]);

  const pins = useMemo(() => {
    if (!proj || !size) return [];
    const minX = EDGE_MARGIN;
    const maxX = size.width - EDGE_MARGIN;
    const minY = insets.top;
    const maxY = size.height - insets.bottom;
    const cx = size.width / 2;
    const cy = (minY + maxY) / 2;

    const raw = places.map((place) => {
      const at = proj.project(place.lat, place.lng);
      // 1px of slack: places on the edge of the fitted bounds land exactly on minY/maxY.
      const inside = at.x >= minX - 1 && at.x <= maxX + 1 && at.y >= minY - 1 && at.y <= maxY + 1;
      if (inside && core.has(place.id)) return { place, at, pos: at, offMapAngle: undefined };
      // Off the map: pin it to the edge, in the direction of the real spot.
      // Walk from the map's center toward the real spot and stop at the inner edge.
      const dx = at.x - cx;
      const dy = at.y - cy;
      const angle = Math.atan2(dy, dx);
      const t = Math.min(
        dx !== 0 ? (dx > 0 ? maxX - cx : minX - cx) / dx : Number.POSITIVE_INFINITY,
        dy !== 0 ? (dy > 0 ? maxY - cy : minY - cy) / dy : Number.POSITIVE_INFINITY,
        1,
      );
      const pos = { x: cx + dx * t, y: cy + dy * t };
      return { place, at, pos, offMapAngle: angle };
    });

    const spread = spreadPins(
      raw.map((r) => ({ id: r.place.id, ...r.pos })),
      46,
      { minX, maxX, minY, maxY },
    );
    return raw.map((r, i) => ({ ...r, pos: spread[i] }));
  }, [proj, size, places, core, insets]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const you = members.find((m) => m.isYou);
  const selectedPin = selectedId ? pins.find((p) => p.place.id === selectedId) : undefined;
  const selectedPicked = selectedPin ? pickedIds.includes(selectedPin.place.id) : false;

  return (
    <View
      className="flex-1 overflow-hidden"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!size || size.width !== width || size.height !== height) setSize({ width, height });
      }}
    >
      {size && proj ? <TileLayer proj={proj} size={size} /> : null}

      {/* Empty map: tapping it closes the callout. Pins and the callout sit above this. */}
      <Pressable
        accessible={false}
        onPress={onDismiss}
        style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
      />

      {size && proj && revealed ? (
        <Svg
          width={size.width}
          height={size.height}
          style={{ position: "absolute" }}
          pointerEvents="none"
        >
          {/* Leader lines from nudged pins back to the real spot. */}
          {pins.map((p) => {
            if (p.offMapAngle !== undefined) return null;
            const moved = Math.hypot(p.pos.x - p.at.x, p.pos.y - p.at.y) > 6;
            if (!moved) return null;
            return (
              <G key={`${p.place.id}-leader`}>
                <Line
                  x1={p.at.x}
                  y1={p.at.y}
                  x2={p.pos.x}
                  y2={p.pos.y}
                  stroke={colors.ink}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
                <Circle cx={p.at.x} cy={p.at.y} r={2.5} fill={colors.ink} />
              </G>
            );
          })}
        </Svg>
      ) : null}

      {revealed
        ? pins.map((p, i) => (
            <PlacePin
              key={p.place.id}
              place={p.place}
              x={p.pos.x}
              y={p.pos.y}
              index={i}
              picked={pickedIds.includes(p.place.id)}
              selected={selectedId === p.place.id}
              pickers={p.place.pickedBy.flatMap((id) => byId.get(id) ?? [])}
              onPress={() => onSelect(p.place.id)}
              offMapAngle={p.offMapAngle}
              offMapLabel={
                p.offMapAngle !== undefined
                  ? `${p.place.name.split(" ").slice(0, 2).join(" ")} · ${
                      p.place.distanceLabel.split(" from ")[0]
                    }`
                  : undefined
              }
            />
          ))
        : null}

      {revealed && selectedPin && size ? (
        <PlaceCallout
          key={selectedPin.place.id}
          place={selectedPin.place}
          picked={selectedPicked}
          pickers={[
            ...(selectedPicked && you ? [you] : []),
            ...selectedPin.place.pickedBy.flatMap((id) => byId.get(id) ?? []),
          ]}
          anchor={selectedPin.pos}
          pinRadius={(PIN_SIZE + 6) / 2}
          mapSize={size}
          minTop={Math.min(CHIPS_HEIGHT, insets.top)}
          onToggle={() => onTogglePick?.(selectedPin.place.id)}
          onDetails={() => onOpenDetails?.(selectedPin.place.id)}
        />
      ) : null}

      {/* Required wherever the tiles show. Tucked under the top overlay (filter chips), in the
          strip above `insets.top` where pins never go. */}
      <View
        pointerEvents="none"
        className="absolute right-0 px-2"
        style={{ top: Math.max(4, insets.top - 34) }}
      >
        <Text className="font-body text-[9px] text-muted">{TILE_ATTRIBUTION}</Text>
      </View>
    </View>
  );
}
