import { Image } from "expo-image";
import { Dimensions } from "react-native";
import { places } from "@/mocks";
import type { Place } from "@/mocks/types";
import { corePlaceIds, fitMap, type Insets, type Size } from "../projection";
import { LAYERS, visibleTiles } from "./TileLayer";

// Must match MAP_INSETS in app/plan/map.tsx (room for the chips and the flights row).
export const DEMO_MAP_INSETS: Insets = { top: 96, right: 52, bottom: 132, left: 52 };
// Screen height the map screen doesn't give the map: header, Route/City toggle, footer, safe areas.
const NON_MAP_HEIGHT = 258;
// Extra margin of tiles around the estimate, in case the real map is a bit bigger or shifted.
const PAD = 160;

// One entry per set of places (a city), so each destination idea prefetches once.
const started = new Set<string>();

// Download the map's tiles into expo-image's memory + disk cache before the map opens, so
// the demo map has streets even if venue Wi-Fi drops later. Safe to call more than once.
// Call it from a screen before the map (e.g. a useEffect on /plan/summary). It must be called
// from there: a module-level call here wouldn't run early, since routes load lazily.
// Works on web too (expo-image prefetches through the browser cache there).
export function prefetchMapTiles(
  mapPlaces: Place[] = places, // MOCK: demo trip places until the plan comes from Supabase
  insets: Insets = DEMO_MAP_INSETS,
) {
  const key = mapPlaces.map((p) => p.id).join(",");
  if (started.has(key) || mapPlaces.length === 0) return;
  started.add(key);
  const window = Dimensions.get("window");
  const size: Size = {
    width: window.width,
    height: Math.max(320, window.height - NON_MAP_HEIGHT),
  };
  const proj = fitMap(mapPlaces, corePlaceIds(mapPlaces), size, insets);
  const urls = LAYERS.flatMap((layer) => visibleTiles(proj, size, layer, PAD).map((t) => t.url));
  const retryLater = () => {
    started.delete(key); // offline right now: let a later call try again
  };
  Image.prefetch(urls, "memory-disk")
    .then((ok) => {
      if (!ok) retryLater();
    })
    .catch(retryLater);
}
