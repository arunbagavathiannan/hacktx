import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import type { Member, Place } from "@/mocks/types";
import { colors } from "@/theme";
import { neighborhoods, parks, rivers, roads } from "./denverBasemap";
import { PlacePin } from "./PlacePin";
import {
  fitProjection,
  type Insets,
  kmBetween,
  type Projection,
  type Size,
  spreadPins,
} from "./projection";

type Props = {
  places: Place[]; // pins to show (already filtered)
  boundsFrom: Place[]; // what the map fits to; keep it the full list so filters don't jump
  members: Member[];
  pickedIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  insets: Insets; // room for overlays (chips on top, flights row at the bottom)
  revealed: boolean; // pins drop in once the globe hands off
};

// Places farther than this from the middle of the group become edge pins pointing off-map,
// so one far-away pick (Red Rocks) doesn't shrink the whole city to a corner.
const CORE_RADIUS_KM = 12;
const EDGE_MARGIN = 48;

const map = {
  land: "#12100E",
  grid: "#1C1916",
  park: "#15201A",
  water: "#17262C",
  highway: "#3B342D",
  highwayCasing: "#0B0A09",
  major: "#28231F",
  label: colors.faint,
};

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

const toPoints = (proj: Projection, line: Array<[number, number]>) =>
  line
    .map(([lat, lng]) => {
      const p = proj.project(lat, lng);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

function Basemap({ proj, size }: { proj: Projection; size: Size }) {
  const grid = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let lat = 39.6; lat <= 39.9; lat += 0.0075) {
      const a = proj.project(lat, -105.3);
      const b = proj.project(lat, -104.8);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    for (let lng = -105.3; lng <= -104.8; lng += 0.0075) {
      const a = proj.project(39.6, lng);
      const b = proj.project(39.9, lng);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return lines;
  }, [proj]);

  return (
    <>
      <Rect x={0} y={0} width={size.width} height={size.height} fill={map.land} />
      <G>
        {grid.map((l) => (
          <Line
            key={`${l.x1.toFixed(1)}-${l.y1.toFixed(1)}`}
            {...l}
            stroke={map.grid}
            strokeWidth={1}
          />
        ))}
      </G>

      {parks.map((p) => {
        const c = proj.project(p.lat, p.lng);
        const rx = proj.project(p.lat, p.lng + p.rLng).x - c.x;
        const ry = c.y - proj.project(p.lat + p.rLat, p.lng).y;
        return <Ellipse key={p.name} cx={c.x} cy={c.y} rx={rx} ry={ry} fill={map.park} />;
      })}

      {rivers.map((r) => (
        <Polyline
          key={r.name}
          points={toPoints(proj, r.points)}
          fill="none"
          stroke={map.water}
          strokeWidth={r.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {roads
        .filter((r) => r.kind === "major")
        .map((r) => (
          <Polyline
            key={r.name}
            points={toPoints(proj, r.points)}
            fill="none"
            stroke={map.major}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

      {roads
        .filter((r) => r.kind === "highway")
        .map((r) => (
          <G key={r.name}>
            <Polyline
              points={toPoints(proj, r.points)}
              fill="none"
              stroke={map.highwayCasing}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points={toPoints(proj, r.points)}
              fill="none"
              stroke={map.highway}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        ))}

      {neighborhoods.map((n) => {
        const p = proj.project(n.lat, n.lng);
        return (
          <SvgText
            key={n.name}
            x={p.x}
            y={p.y}
            fill={map.label}
            fontSize={9}
            fontFamily="Manrope_700Bold"
            letterSpacing={2}
            textAnchor="middle"
            opacity={0.8}
          >
            {n.name}
          </SvgText>
        );
      })}

      {roads.map((r) => {
        if (r.labelAt === undefined) return null;
        const a = r.points[r.labelAt];
        const b = r.points[r.labelAt + 1] ?? a;
        const pa = proj.project(a[0], a[1]);
        const pb = proj.project(b[0], b[1]);
        const x = (pa.x + pb.x) / 2;
        const y = (pa.y + pb.y) / 2;

        if (r.kind === "highway") {
          return (
            <G key={`${r.name}-label`}>
              <Rect
                x={x - 15}
                y={y - 8}
                width={30}
                height={16}
                rx={5}
                fill={colors.raised}
                stroke={colors.line}
              />
              <SvgText
                x={x}
                y={y + 3.5}
                fill={colors.muted}
                fontSize={9}
                fontFamily="Manrope_700Bold"
                textAnchor="middle"
              >
                {r.name}
              </SvgText>
            </G>
          );
        }

        let angle = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
        return (
          <SvgText
            key={`${r.name}-label`}
            x={x}
            y={y - 4}
            fill={map.label}
            fontSize={9}
            fontFamily="Manrope_600SemiBold"
            textAnchor="middle"
            rotation={angle}
            origin={`${x}, ${y}`}
          >
            {r.name}
          </SvgText>
        );
      })}
    </>
  );
}

// Styled Denver map stand-in until we have a Google Maps key. Same props would drive a
// react-native-maps <MapView> with <Marker>s, so screens don't change when it's swapped.
export function MapCanvas({
  places,
  boundsFrom,
  members,
  pickedIds,
  selectedId,
  onSelect,
  insets,
  revealed,
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

  return (
    <View
      className="flex-1 overflow-hidden"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!size || size.width !== width || size.height !== height) setSize({ width, height });
      }}
    >
      {size && proj ? (
        <Svg width={size.width} height={size.height} style={{ position: "absolute" }}>
          <Basemap proj={proj} size={size} />
          {/* Leader lines from nudged pins back to the real spot. */}
          {revealed
            ? pins.map((p) => {
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
                      stroke={colors.muted}
                      strokeOpacity={0.5}
                      strokeWidth={1}
                    />
                    <Circle cx={p.at.x} cy={p.at.y} r={2.5} fill={colors.muted} />
                  </G>
                );
              })
            : null}
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
    </View>
  );
}
