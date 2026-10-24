import { useEffect, useMemo, useRef } from "react";
import { Color, MeshPhongMaterial, Vector3 } from "three";
import ThreeGlobe from "three-globe";
import countries from "@/assets/geo/countries-110m.json";
import { colors } from "@/theme";
import { Canvas, useFrame } from "./fiber";

// three-globe (github.com/vasturiano/three-globe) inside @react-three/fiber: dotted countries,
// an arc from the origin city to the destination, pulse rings, then a camera dive into the
// destination. Calls onDone when the dive ends so the screen can switch to the city map.

type City = { lat: number; lng: number };

type Props = {
  origin: City;
  destination: City;
  onDone: () => void;
  durationMs?: number;
};

const RADIUS = 100; // three-globe's default globe radius
const START_DISTANCE = 330;
const END_DISTANCE = 128;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function GlobeScene({ origin, destination, onDone, durationMs = 3400 }: Props) {
  const elapsed = useRef(0);
  const finished = useRef(false);

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
      .arcsData([
        {
          startLat: origin.lat,
          startLng: origin.lng,
          endLat: destination.lat,
          endLng: destination.lng,
        },
      ])
      .arcColor(() => [colors.gold, colors.accent])
      .arcAltitude(0.22)
      .arcStroke(0.7)
      .arcDashLength(0.6)
      .arcDashGap(0.4)
      .arcDashInitialGap(1)
      .arcDashAnimateTime(1800)
      .ringsData([destination])
      .ringColor(() => (t: number) => `rgba(255, 122, 61, ${1 - t})`)
      .ringMaxRadius(5)
      .ringPropagationSpeed(2.5)
      .ringRepeatPeriod(800)
      .pointsData([
        { ...origin, color: colors.gold },
        { ...destination, color: colors.accent },
      ])
      .pointColor("color")
      .pointAltitude(0.015)
      .pointRadius(0.7);

    g.globeMaterial(
      new MeshPhongMaterial({
        color: new Color(colors.surface),
        emissive: new Color(colors.bg),
        shininess: 4,
      }),
    );
    return g;
  }, [origin, destination]);

  // Camera path: start far out over the midpoint of the trip, dive onto the destination.
  const path = useMemo(() => {
    const toVec = (c: City, distance: number) => {
      const p = globe.getCoords(c.lat, c.lng, 0);
      return new Vector3(p.x, p.y, p.z).normalize().multiplyScalar(distance);
    };
    const mid = {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };
    return { from: toVec(mid, START_DISTANCE), to: toVec(destination, END_DISTANCE) };
  }, [globe, origin, destination]);

  useFrame((state, delta) => {
    elapsed.current += delta * 1000;
    const t = Math.min(elapsed.current / durationMs, 1);
    const k = easeInOut(t);
    // Slerp the direction, lerp the distance, so the camera arcs around the globe.
    const dir = path.from.clone().normalize().lerp(path.to.clone().normalize(), k).normalize();
    const distance = START_DISTANCE + (END_DISTANCE - START_DISTANCE) * k;
    state.camera.position.copy(dir.multiplyScalar(distance));
    state.camera.lookAt(0, 0, 0);
    if (t >= 1 && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return <primitive object={globe} />;
}

export function GlobeIntro(props: Props) {
  // If the GL context never renders (e.g. no WebGL), don't trap the user on the intro.
  const { onDone, durationMs = 3400 } = props;
  useEffect(() => {
    const fallback = setTimeout(onDone, durationMs + 2500);
    return () => clearTimeout(fallback);
  }, [onDone, durationMs]);

  return (
    <Canvas
      style={{ flex: 1, backgroundColor: colors.bg }}
      camera={{ fov: 45, near: 1, far: 2000, position: [0, 0, START_DISTANCE] }}
      onCreated={({ gl }) => gl.setClearColor(colors.bg)}
    >
      <ambientLight intensity={1.4} color={colors.ink} />
      <directionalLight position={[-RADIUS * 3, RADIUS * 2, RADIUS * 3]} intensity={1.2} />
      <GlobeScene {...props} />
    </Canvas>
  );
}
