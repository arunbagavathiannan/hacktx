// Web Mercator projection, the same math slippy-map tiles use (Esri, OpenStreetMap), so
// pins land on the right street of the basemap. Coordinates are "world" units in [0, 1]
// at zoom 0; one tile covers 1 / 2^z of the world at zoom z.

export type Size = { width: number; height: number };
export type Insets = { top: number; right: number; bottom: number; left: number };
export type LatLng = { lat: number; lng: number };

export type Projection = {
  project: (lat: number, lng: number) => { x: number; y: number };
  zoom: number; // fractional; tiles come at whole zooms and are scaled to match
  scale: number; // screen px per world unit (256 * 2^zoom)
  center: { x: number; y: number }; // world coords at the screen anchor
  anchor: { x: number; y: number }; // screen px where `center` is drawn
};

export const TILE_SIZE = 256;
const KM_PER_DEG = 111.32;
const MAX_ZOOM = 15.5; // a single pin shouldn't zoom in to one building
const MAX_LAT = 85.0511; // Web Mercator's cutoff

export function kmBetween(a: LatLng, b: LatLng) {
  const cos = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot((a.lat - b.lat) * KM_PER_DEG, (a.lng - b.lng) * KM_PER_DEG * cos);
}

export function toWorld(lat: number, lng: number) {
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}

// Fit the points inside the size minus insets (room for chips and the flights row).
export function fitProjection(points: LatLng[], size: Size, insets: Insets): Projection {
  const world = points.map((p) => toWorld(p.lat, p.lng));
  const xs = world.map((w) => w.x);
  const ys = world.map((w) => w.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];

  const innerW = Math.max(1, size.width - insets.left - insets.right);
  const innerH = Math.max(1, size.height - insets.top - insets.bottom);
  const fitScale = Math.min(
    innerW / Math.max(maxX - minX, 1e-9),
    innerH / Math.max(maxY - minY, 1e-9),
  );
  const zoom = Math.min(MAX_ZOOM, Math.log2(fitScale / TILE_SIZE));
  const scale = TILE_SIZE * 2 ** zoom;

  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const anchor = { x: insets.left + innerW / 2, y: insets.top + innerH / 2 };
  return {
    zoom,
    scale,
    center,
    anchor,
    project: (lat, lng) => {
      const w = toWorld(lat, lng);
      return {
        x: anchor.x + (w.x - center.x) * scale,
        y: anchor.y + (w.y - center.y) * scale,
      };
    },
  };
}

// Places farther than this from the middle of the group become edge pins pointing off-map,
// so one far-away pick (Red Rocks) doesn't shrink the whole city to a corner.
const CORE_RADIUS_KM = 12;
const FALLBACK_CENTER = { lat: 39.7392, lng: -104.9903 }; // downtown Denver

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

// Ids of the places the map fits to (the ones near the middle of the group).
export function corePlaceIds(places: Array<LatLng & { id: string }>) {
  const center = { lat: median(places.map((p) => p.lat)), lng: median(places.map((p) => p.lng)) };
  const near = places.filter((p) => kmBetween(p, center) <= CORE_RADIUS_KM);
  return new Set((near.length > 0 ? near : places).map((p) => p.id));
}

// map.tsx fades the top of the map under the chips (a 72 px gradient). A callout opened
// near the top stays below it.
export const TOP_FADE = 72;

// The map's view for these places: fit to the core ones. Shared by MapCanvas and the tile
// prefetcher so both ask for the same tiles.
export function fitMap(
  places: Array<LatLng & { id: string }>,
  core: Set<string>,
  size: Size,
  insets: Insets,
) {
  const fit = places.filter((p) => core.has(p.id));
  return fitProjection(fit.length > 0 ? fit : [FALLBACK_CENTER], size, insets);
}

type Pin = { id: string; x: number; y: number };

// Nudge pins apart so ones a block away from each other don't stack. Returns new positions;
// callers draw a leader line back to the true spot when a pin moved.
// Pins stay inside `bounds` so they never slide under the overlays.
export function spreadPins(
  pins: Pin[],
  minDist: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  iterations = 80,
): Pin[] {
  const clamp = (p: Pin) => {
    p.x = Math.min(bounds.maxX, Math.max(bounds.minX, p.x));
    p.y = Math.min(bounds.maxY, Math.max(bounds.minY, p.y));
  };
  const out = pins.map((p) => ({ ...p }));
  out.forEach(clamp);
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        if (d < 0.01) {
          // Same spot: split along a stable angle so the layout is the same every render.
          const angle = (i * 2.4 + j) % (Math.PI * 2);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          d = 1;
        }
        const push = (minDist - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        clamp(a);
        clamp(b);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}
