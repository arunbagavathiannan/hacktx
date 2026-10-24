import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { View } from "react-native";
import { colors } from "@/theme";
import type { Projection, Size } from "../projection";

// Esri's "Dark Gray Canvas" raster tiles (OpenStreetMap + HERE/Garmin data), no API key.
// CARTO Dark Matter was the first pick, but it now serves an "API key required" image to
// keyless requests. Esri splits the map in two: streets (base) and place names (reference).
// Attribution is required wherever these show.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
type Layer = {
  id: string;
  url: (z: number, x: number, y: number) => string;
  // Draw this layer's tiles from one zoom deeper, at half size, so 256px tiles stay sharp
  // on high-density phone screens. Only for the base: deeper labels would be tiny.
  sharpen: boolean;
};
const LAYERS: Layer[] = [
  {
    id: "base",
    url: (z, x, y) => `${ESRI}/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
    sharpen: true,
  },
  {
    id: "labels",
    url: (z, x, y) => `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/${z}/${y}/${x}`,
    sharpen: false,
  },
];
const MAX_TILE_ZOOM = 16; // Dark Gray Canvas stops here

export const TILE_ATTRIBUTION = "Esri, HERE, Garmin, © OpenStreetMap contributors";

// Esri's gray is lighter than the app; this warm wash pulls it toward `colors.bg` so the pins pop.
const SHADE_OPACITY = 0.5;
// Dark Gray Canvas's land color. Shown under tiles that are still loading, so a slow tile
// reads as plain land (streets fade in) instead of a black hole in a checkerboard.
const LAND = "#535355";

type Tile = { key: string; url: string; left: number; top: number; size: number };

// Which tiles cover the screen, and where each one goes. Tiles come at whole zooms, so for a
// fractional fit zoom we take a nearby whole zoom and scale its tiles to match.
export function visibleTiles(proj: Projection, size: Size, layer: Layer): Tile[] {
  const z = Math.min(MAX_TILE_ZOOM, Math.max(0, Math.round(proj.zoom) + (layer.sharpen ? 1 : 0)));
  const n = 2 ** z;
  // Screen edge -> world -> tile index.
  const toTileX = (sx: number) => (proj.center.x + (sx - proj.anchor.x) / proj.scale) * n;
  const toTileY = (sy: number) => (proj.center.y + (sy - proj.anchor.y) / proj.scale) * n;
  const x0 = Math.floor(toTileX(0));
  const x1 = Math.floor(toTileX(size.width));
  const y0 = Math.max(0, Math.floor(toTileY(0)));
  const y1 = Math.min(n - 1, Math.floor(toTileY(size.height)));
  // Screen position of a tile edge. Rounding edges (not sizes) keeps neighbors seamless.
  const edgeX = (tx: number) => Math.round(proj.anchor.x + (tx / n - proj.center.x) * proj.scale);
  const edgeY = (ty: number) => Math.round(proj.anchor.y + (ty / n - proj.center.y) * proj.scale);

  const tiles: Tile[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const left = edgeX(tx);
      const top = edgeY(ty);
      tiles.push({
        key: `${layer.id}/${z}/${tx}/${ty}`,
        url: layer.url(z, ((tx % n) + n) % n, ty), // the world repeats east-west
        left,
        top,
        // Square tiles: take the larger rounded side so there's never a hairline gap.
        size: Math.max(edgeX(tx + 1) - left, edgeY(ty + 1) - top),
      });
    }
  }
  return tiles;
}

// Real streets under the pins. Plain absolutely positioned images (~25 for a phone-sized
// map), cached by expo-image, so it's cheap to render.
export const TileLayer = memo(function TileLayer({ proj, size }: { proj: Projection; size: Size }) {
  const [base, labels] = useMemo(
    () => LAYERS.map((layer) => visibleTiles(proj, size, layer)),
    [proj, size],
  );
  const fill = {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: size.width,
    height: size.height,
  };
  return (
    <View pointerEvents="none" style={[fill, { backgroundColor: LAND }]}>
      {base.map((t) => (
        <TileImage key={t.key} tile={t} />
      ))}
      <View style={[fill, { backgroundColor: colors.bg, opacity: SHADE_OPACITY }]} />
      {labels.map((t) => (
        <TileImage key={t.key} tile={t} />
      ))}
    </View>
  );
});

function TileImage({ tile }: { tile: Tile }) {
  return (
    <Image
      source={{ uri: tile.url }}
      cachePolicy="memory-disk"
      contentFit="fill"
      transition={180}
      accessible={false}
      style={{
        position: "absolute",
        left: tile.left,
        top: tile.top,
        width: tile.size,
        height: tile.size,
      }}
    />
  );
}
