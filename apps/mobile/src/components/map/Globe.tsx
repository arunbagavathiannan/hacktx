import { useEffect, useMemo, useRef } from "react";
import { Color, MeshPhongMaterial, PerspectiveCamera, Vector3 } from "three";
import ThreeGlobe from "three-globe";
import countries from "@/assets/geo/countries-110m.json";
import { colors } from "@/theme";
import { Canvas, useFrame } from "./fiber";

// three-globe (github.com/vasturiano/three-globe) inside @react-three/fiber.
// "choose": arcs from the origin to every suggested destination; the selected one glows.
// "dive": the camera flies into the selected destination, then onDiveDone fires.

type City = { id: string; lat: number; lng: number };

type Props = {
  origin: { lat: number; lng: number };
  destinations: City[];
  selectedId: string;
  phase: "choose" | "dive";
  onDiveDone: () => void;
};

const OVERVIEW_DISTANCE = 430;
// Push the globe up by this fraction of the screen so the destination cards don't cover it.
const VIEW_LIFT = 0.12;
const DIVE_DISTANCE = 128;
const DIVE_MS = 2600;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const dim = "rgba(163, 155, 145, 0.35)";

function GlobeScene({ origin, destinations, selectedId, phase, onDiveDone }: Props) {
  const globe = useMemo(() => {
    const g = new ThreeGlobe({ animateIn: false })
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.35)
      .hexPolygonUseDots(true)
      .hexPolygonColor(() => colors.muted)
      .showAtmosphere(true)
      .atmosphereColor(colors.accent)
      .atmosphereAltitude(0.16)
      .arcAltitude(0.25)
      .arcStroke(0.9)
      .arcDashLength(0.9)
      .arcDashGap(0.15)
      .arcDashAnimateTime(2400)
      .ringMaxRadius(5)
      .ringPropagationSpeed(2.5)
      .ringRepeatPeriod(800)
      .ringColor(() => (t: number) => `rgba(255, 122, 61, ${1 - t})`)
      .pointAltitude(0.015)
      .pointRadius(0.7)
      .pointColor("color");
    g.globeMaterial(
      new MeshPhongMaterial({
        color: new Color(colors.surface),
        emissive: new Color(colors.bg),
        shininess: 4,
      }),
    );
    return g;
  }, []);

  // Data layers follow the selection: the chosen arc is warm, the rest are dim.
  useEffect(() => {
    globe
      .arcsData(
        destinations.map((d) => ({
          startLat: origin.lat,
          startLng: origin.lng,
          endLat: d.lat,
          endLng: d.lng,
          selected: d.id === selectedId,
        })),
      )
      .arcColor((a: object) =>
        (a as { selected: boolean }).selected ? [colors.gold, colors.accent] : [dim, dim],
      )
      .ringsData(destinations.filter((d) => d.id === selectedId))
      .pointsData([
        { ...origin, color: colors.gold },
        ...destinations.map((d) => ({
          lat: d.lat,
          lng: d.lng,
          color: d.id === selectedId ? colors.accent : colors.muted,
        })),
      ]);
  }, [globe, origin, destinations, selectedId]);

  const toVec = (lat: number, lng: number, distance: number) => {
    const p = globe.getCoords(lat, lng, 0);
    return new Vector3(p.x, p.y, p.z).normalize().multiplyScalar(distance);
  };

  // Overview: look at the middle of origin + all destinations.
  const overview = useMemo(() => {
    const all = [origin, ...destinations];
    const lat = all.reduce((s, c) => s + c.lat, 0) / all.length;
    const lng = all.reduce((s, c) => s + c.lng, 0) / all.length;
    const p = globe.getCoords(lat, lng, 0);
    return new Vector3(p.x, p.y, p.z).normalize().multiplyScalar(OVERVIEW_DISTANCE);
  }, [globe, origin, destinations]);

  const diveStart = useRef<Vector3 | null>(null);
  const diveElapsed = useRef(0);
  const done = useRef(false);
  const swayTime = useRef(0);

  useFrame((state, delta) => {
    const cam = state.camera;
    // Lift the globe above the cards while choosing; ease back to centered during the dive.
    if (cam instanceof PerspectiveCamera) {
      const k = phase === "choose" ? 0 : easeInOut(Math.min(diveElapsed.current / DIVE_MS, 1));
      const { width, height } = state.size;
      cam.setViewOffset(width, height, 0, height * VIEW_LIFT * (1 - k), width, height);
    }
    if (phase === "choose") {
      // Gentle sway around the overview so the scene feels alive.
      swayTime.current += delta;
      const sway = new Vector3(
        Math.sin(swayTime.current * 0.4) * 18,
        Math.cos(swayTime.current * 0.3) * 8,
        0,
      );
      cam.position.lerp(overview.clone().add(sway), 0.04);
    } else {
      const selected = destinations.find((d) => d.id === selectedId);
      if (!selected) return;
      if (!diveStart.current) diveStart.current = cam.position.clone();
      diveElapsed.current += delta * 1000;
      const t = Math.min(diveElapsed.current / DIVE_MS, 1);
      const k = easeInOut(t);
      const from = diveStart.current;
      const to = toVec(selected.lat, selected.lng, DIVE_DISTANCE);
      const dir = from.clone().normalize().lerp(to.clone().normalize(), k).normalize();
      cam.position.copy(dir.multiplyScalar(from.length() + (DIVE_DISTANCE - from.length()) * k));
      if (t >= 1 && !done.current) {
        done.current = true;
        onDiveDone();
      }
    }
    cam.lookAt(0, 0, 0);
  });

  return <primitive object={globe} />;
}

export function Globe(props: Props) {
  // If WebGL never renders, don't trap the user mid-dive.
  const { phase, onDiveDone } = props;
  useEffect(() => {
    if (phase !== "dive") return;
    const fallback = setTimeout(onDiveDone, DIVE_MS + 2500);
    return () => clearTimeout(fallback);
  }, [phase, onDiveDone]);

  return (
    <Canvas
      style={{ flex: 1, backgroundColor: colors.bg }}
      camera={{ fov: 45, near: 1, far: 2000, position: [0, 0, OVERVIEW_DISTANCE] }}
      onCreated={({ gl }) => gl.setClearColor(colors.bg)}
    >
      <ambientLight intensity={1.4} color={colors.ink} />
      <directionalLight position={[-300, 200, 300]} intensity={1.2} />
      <GlobeScene {...props} />
    </Canvas>
  );
}
