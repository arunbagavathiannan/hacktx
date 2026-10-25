import { Image } from "expo-image";
import { memo, useMemo, useState } from "react";
import { View } from "react-native";
import { colors } from "@/theme";
import type { Projection, Size } from "../projection";

// Esri's "Dark Gray Canvas" raster tiles (OpenStreetMap + HERE/Garmin data), no API key.
// Esri splits the map in two: streets (base) and place names (reference).
// Attribution (see Attribution.tsx) is required wherever these show.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
type Layer = {
  id: string;
  url: (z: number, x: number, y: number) => string;
  tileZoom: (fitZoom: number) => number;
};
const MAX_TILE_ZOOM = 16; // Dark Gray Canvas stops here
export const LAYERS: Layer[] = [
  {
    id: "base",
    url: (z, x, y) => `${ESRI}/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
    // One zoom deeper than the fit, so each 256px tile shows at 128-256 dp: sharp on phone
    // screens, and the tile count stays steady (~10-30) as the fit zoom changes.
    tileZoom: (fit) => Math.floor(fit) + 1,
  },
  {
    id: "labels",
    url: (z, x, y) => `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/${z}/${y}/${x}`,
    // Nearest whole zoom, so place names stay close to their designed size.
    tileZoom: (fit) => Math.round(fit),
  },
];

// Esri's gray is lighter than the app; this warm wash pulls it toward `colors.bg` so the pins pop.
const SHADE_OPACITY = 0.5;
// Dark Gray Canvas's land color. Shown under tiles that are still loading, so a slow tile
// reads as plain land (streets fade in) instead of a black hole in a checkerboard.
const LAND = "#535355";

type Tile = { key: string; url: string; left: number; top: number; size: number };

// Which tiles cover the screen (plus `pad` px around it), and where each one goes.
export function visibleTiles(proj: Projection, size: Size, layer: Layer, pad = 0): Tile[] {
  const z = Math.min(MAX_TILE_ZOOM, Math.max(0, layer.tileZoom(proj.zoom)));
  const n = 2 ** z;
  // Screen edge -> world -> tile index.
  const toTileX = (sx: number) => (proj.center.x + (sx - proj.anchor.x) / proj.scale) * n;
  const toTileY = (sy: number) => (proj.center.y + (sy - proj.anchor.y) / proj.scale) * n;
  const x0 = Math.floor(toTileX(-pad));
  const x1 = Math.floor(toTileX(size.width + pad));
  const y0 = Math.max(0, Math.floor(toTileY(-pad)));
  const y1 = Math.min(n - 1, Math.floor(toTileY(size.height + pad)));
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

// Real streets under the pins. Plain absolutely positioned images (~15-40 for a phone-sized
// map, both layers), cached by expo-image, so it's cheap to render.
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
        <TileImage key={t.key} tile={t} fallback />
      ))}
      <View style={[fill, { backgroundColor: colors.bg, opacity: SHADE_OPACITY }]} />
      {labels.map((t) => (
        <TileImage key={t.key} tile={t} />
      ))}
    </View>
  );
});

// A base tile that fails (offline, bad Wi-Fi) becomes a faint street grid, so the map still
// reads as a map and the pins on top keep working. Failed label tiles just stay empty.
function TileImage({ tile, fallback = false }: { tile: Tile; fallback?: boolean }) {
  const [failed, setFailed] = useState(false);
  const box = {
    position: "absolute" as const,
    left: tile.left,
    top: tile.top,
    width: tile.size,
    height: tile.size,
  };
  if (failed) return fallback ? <OfflineTile box={box} /> : null;
  return (
    <Image
      source={{ uri: tile.url }}
      cachePolicy="memory-disk"
      contentFit="fill"
      transition={180}
      accessible={false}
      onError={() => setFailed(true)}
      style={box}
    />
  );
}

const GRID_LINES = [0.25, 0.5, 0.75];
const GRID = "#6E6E70"; // lighter than LAND; the shade on top dims it to a quiet grid

type Box = { position: "absolute"; left: number; top: number; width: number; height: number };

function OfflineTile({ box }: { box: Box }) {
  return (
    <View style={box}>
      {GRID_LINES.map((f) => (
        <View
          key={`h${f}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: f * box.width,
            height: 1,
            backgroundColor: GRID,
          }}
        />
      ))}
      {GRID_LINES.map((f) => (
        <View
          key={`v${f}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: f * box.width,
            width: 1,
            backgroundColor: GRID,
          }}
        />
      ))}
    </View>
  );
}
