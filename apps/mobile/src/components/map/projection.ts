// Simple equirectangular projection for a city-sized map: longitude is scaled by
// cos(latitude) so a kilometer is the same length in both directions.

export type Size = { width: number; height: number };
export type Insets = { top: number; right: number; bottom: number; left: number };
export type LatLng = { lat: number; lng: number };

export type Projection = {
  project: (lat: number, lng: number) => { x: number; y: number };
};

const KM_PER_DEG = 111.32;

export function kmBetween(a: LatLng, b: LatLng) {
  const cos = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot((a.lat - b.lat) * KM_PER_DEG, (a.lng - b.lng) * KM_PER_DEG * cos);
}

// Fit the points inside the size minus insets (room for chips and the flights row).
export function fitProjection(points: LatLng[], size: Size, insets: Insets): Projection {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const lat0 = (minLat + maxLat) / 2;
  const lng0 = (minLng + maxLng) / 2;
  const cos = Math.cos((lat0 * Math.PI) / 180);

  const innerW = Math.max(1, size.width - insets.left - insets.right);
  const innerH = Math.max(1, size.height - insets.top - insets.bottom);
  // Guard against a single point (zero span): fall back to roughly 3 km across.
  const spanLng = Math.max((maxLng - minLng) * cos, 0.027);
  const spanLat = Math.max(maxLat - minLat, 0.027);
  const k = Math.min(innerW / spanLng, innerH / spanLat); // px per degree of latitude

  const cx = insets.left + innerW / 2;
  const cy = insets.top + innerH / 2;
  return {
    project: (lat, lng) => ({ x: cx + (lng - lng0) * cos * k, y: cy - (lat - lat0) * k }),
  };
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
