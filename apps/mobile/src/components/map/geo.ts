// Web Mercator helpers for the city map (same math as Google/OSM tiles).

export const TILE = 256;

type LatLng = { lat: number; lng: number };
type Point = { x: number; y: number };

// lat/lng -> world pixel at a zoom level.
export function project({ lat, lng }: LatLng, zoom: number): Point {
  const size = TILE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

// Largest integer zoom where every point fits inside the box (minus padding),
// plus the world-pixel center of those points at that zoom.
export function fitBounds(
  points: LatLng[],
  width: number,
  height: number,
  padding = 56,
  maxZoom = 15,
): { zoom: number; center: Point } {
  for (let zoom = maxZoom; zoom >= 2; zoom--) {
    const px = points.map((p) => project(p, zoom));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX - minX <= width - padding * 2 && maxY - minY <= height - padding * 2) {
      return { zoom, center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } };
    }
  }
  return { zoom: 2, center: project(points[0] ?? { lat: 0, lng: 0 }, 2) };
}
