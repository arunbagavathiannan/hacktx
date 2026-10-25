import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { colors } from "@/theme";
import { PULSE } from "@/theme/motion";
import { degreesBetween, easeInOutCubic, easeOutCubic, landDots, latLngToXYZ } from "./geo";

type LatLng = { lat: number; lng: number };

// `code` and `name` are for labels drawn outside the scene (RouteView); the scene ignores them.
export type GlobePoint = LatLng & { kind: "origin" | "stop"; code?: string; name?: string };
export type GlobeArc = { from: LatLng; to: LatLng; mode?: "fly" | "drive" };
// Where a point lands on the canvas, in canvas pixels (dp on native).
export type ScreenPoint = { x: number; y: number; visible: boolean };
// The settled overview on screen: each of `points`, and samples along each arc.
export type ScreenProjection = { points: ScreenPoint[]; arcs: ScreenPoint[][] };

export type GlobeProps = {
  focus: LatLng; // where the camera ends up looking (the destination, or the route's middle)
  points: GlobePoint[];
  arcs: GlobeArc[];
  // "intro" dives into the focus and calls onDone. "overview" frames every point and arc
  // (ignoring `focus`), and stays there.
  variant?: "intro" | "overview";
  durationMs?: number;
  // Hold the zoom at this progress (0-1) instead of playing it. Used for screenshots.
  frozenAt?: number;
  onDone?: () => void;
  onFirstFrame?: () => void; // GL is up and drawing (used by SafeGlobe's timeout)
  // Overview only. Dots that travel along the arcs and rings that breathe on the stops. Pass
  // false for reduced motion.
  ambient?: boolean;
  // Overview only. Screen positions of `points` and the arcs once the camera settles (and
  // again on a resize), so the caller can draw crisp labels on top of the canvas.
  onProject?: (projection: ScreenProjection) => void;
};

// Shared three.js scene for Globe.web.tsx and Globe.native.tsx. Low-poly, no textures:
// a dark sphere, dotted land, a sunset rim glow, and an arc per leg of the trip.

const LAND_DOTS = 16000;
const DOT_COLOR = new THREE.Color("#8C7B6B");
const HOT_COLOR = new THREE.Color(colors.accent);
// Flights are accent, the origin is gold, drives are ink (the Route legend matches).
export const DRIVE_ARC_COLOR = colors.ink;
// Longest frame step the animation takes. A stalled first frame (shader compile, slow GL
// start) would otherwise jump the intro straight to the end.
const MAX_DELTA = 1 / 30;

const CAMERA = {
  intro: { dist: 1.6, latOffset: -9, lookIn: 0.6, arcFrom: 0.3, arcSpan: 0.5 },
  overview: { arcFrom: 0.2, arcSpan: 0.65 },
};

// Route overview: the camera frames the whole route instead of diving at one city.
const OVERVIEW = {
  // Finer, dimmer land than the intro (the route view sits closer to the ground), with a
  // softer warm-up near stops, so the arcs pop.
  land: { count: 30000, heatRadius: 7, heatStrength: 0.45, dim: 0.62 } as LandLook,
  dotFill: 0.5, // dot diameter as a share of the gap between dots
  tilt: 22, // degrees the view leans north from straight down: some depth, no wall
  // Stops and arc tops must land inside this box (normalized device coords). Leaves room
  // for labels around the stops, the legend at the bottom, and land around the route.
  fitX: 0.4,
  fitY: 0.32,
  minAlt: 0.3, // a one-city "route" doesn't zoom into the street
  maxAlt: 3,
  // Sizes in screen pixels, turned into world units at the route's depth.
  arcPx: 2.4,
  glowPx: 7,
  stopPx: 6,
  originPx: 7,
  homeHole: 0.5, // the home ring's hole, as a share of its radius
  outlinePx: 2,
};

const earthShader = {
  uniforms: {
    uBase: { value: new THREE.Color("#14110E") },
    uRim: { value: new THREE.Color(colors.accent) },
  },
  vertexShader: /* glsl */ `
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uBase;
    uniform vec3 uRim;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
      gl_FragColor = vec4(mix(uBase, uRim, f * 0.55), 1.0);
    }
  `,
};

const glowShader = {
  uniforms: { uColor: { value: new THREE.Color(colors.accent) } },
  vertexShader: earthShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      float f = pow(clamp(-dot(vN, vV) * 1.9, 0.0, 1.0), 2.2);
      gl_FragColor = vec4(uColor, f * 0.55);
    }
  `,
};

const dotShader = {
  vertexShader: /* glsl */ `
    attribute vec3 aColor;
    uniform float uSize;
    uniform float uPixelRatio;
    varying vec3 vColor;
    void main() {
      vColor = aColor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = uSize * uPixelRatio / -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      gl_FragColor = vec4(vColor, smoothstep(0.5, 0.25, d));
    }
  `,
};

type LandLook = { count: number; heatRadius: number; heatStrength: number; dim: number };
const INTRO_LAND: LandLook = { count: LAND_DOTS, heatRadius: 14, heatStrength: 1, dim: 1 };

function useLandDots(hotspots: LatLng[], { count, heatRadius, heatStrength, dim }: LandLook) {
  return useMemo(() => {
    const dots = landDots(count);
    const base = DOT_COLOR.clone().multiplyScalar(dim);
    const positions = new Float32Array(dots.length * 3);
    const tint = new Float32Array(dots.length * 3);
    const c = new THREE.Color();
    dots.forEach((d, i) => {
      positions.set(latLngToXYZ(d.lat, d.lng, 1.003), i * 3);
      // Land near the stops warms up to the accent color.
      const nearest = Math.min(...hotspots.map((h) => degreesBetween(d, h)));
      const heat = Math.max(0, 1 - nearest / heatRadius);
      c.copy(base).lerp(HOT_COLOR, heat * heat * heatStrength);
      tint.set([c.r, c.g, c.b], i * 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(tint, 3));
    return geometry;
  }, [hotspots, count, heatRadius, heatStrength, dim]);
}

const toVec = (p: LatLng, r = 1) => new THREE.Vector3(...latLngToXYZ(p.lat, p.lng, r));

function arcCurve(arc: GlobeArc, variant: "intro" | "overview") {
  const a = toVec(arc.from);
  const b = toVec(arc.to);
  const drive = arc.mode === "drive";
  const chord = a.distanceTo(b);
  // Drives hug the ground; flights lift off it. Seen from above (the route overview),
  // lift barely shows, so overview flights also bow sideways to read as arcs and to keep
  // an out-and-back pair of legs apart.
  const lift = variant === "intro" ? (drive ? 0.008 : 0.045) : drive ? 0.006 : 0.2 * chord;
  const bow = variant === "overview" && !drive ? 0.16 * chord : 0;
  const side = new THREE.Vector3().crossVectors(a, b).normalize();
  const points: THREE.Vector3[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bulge = Math.sin(Math.PI * t);
    const p = a
      .clone()
      .lerp(b, t)
      .addScaledVector(side, bulge * bow)
      .normalize();
    points.push(p.multiplyScalar(1.004 + bulge * lift));
  }
  return new THREE.CatmullRomCurve3(points);
}

// Unwrapped bounding box middle of the points (works across the antimeridian).
function boxCenter(points: LatLng[]): LatLng {
  const first = points[0]?.lng ?? 0;
  const lngs = points.map((p) => first + ((((p.lng - first + 540) % 360) + 360) % 360) - 180);
  const lats = points.map((p) => p.lat);
  let lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng };
}

type Frame = { lat: number; lng: number; dist: number; look: THREE.Vector3; depth: number };

// Pull the camera back until every stop and every arc's top fits the OVERVIEW box.
function fitRoute(
  points: LatLng[],
  curves: THREE.Curve<THREE.Vector3>[],
  fallback: LatLng,
  aspect: number,
  fov: number,
): Frame {
  const stops = points.length > 0 ? points : [fallback];
  const center = boxCenter(stops);
  const probes = [...stops.map((p) => toVec(p, 1.004)), ...curves.flatMap((c) => c.getPoints(16))];
  const look = toVec(center);
  // Straight up from the route's middle, leaned toward the south by `tilt`.
  const south = toVec({ lat: center.lat - 1, lng: center.lng })
    .sub(look)
    .normalize();
  const tilt = (OVERVIEW.tilt * Math.PI) / 180;
  const view = look
    .clone()
    .multiplyScalar(Math.cos(tilt))
    .addScaledVector(south, Math.sin(tilt))
    .normalize();
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.01, 100);
  const v = new THREE.Vector3();
  const place = (alt: number) => {
    cam.position.copy(look).addScaledVector(view, alt);
    cam.lookAt(look);
    cam.updateMatrixWorld();
  };
  const fits = (alt: number) => {
    place(alt);
    return probes.every((p) => {
      v.copy(p).project(cam);
      return Math.abs(v.x) <= OVERVIEW.fitX && Math.abs(v.y) <= OVERVIEW.fitY && v.z < 1;
    });
  };
  let lo = OVERVIEW.minAlt;
  let hi = OVERVIEW.maxAlt;
  if (fits(lo)) hi = lo;
  else {
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
  }
  place(hi);
  // As lat/lng/distance, so the swing-in can ease toward it like the intro does.
  const dist = cam.position.length();
  const dir = cam.position.clone().divideScalar(dist);
  const lat = (Math.asin(Math.min(1, Math.max(-1, dir.y))) * 180) / Math.PI;
  let lng = (Math.atan2(dir.z, -dir.x) * 180) / Math.PI - 180;
  if (lng < -180) lng += 360;
  return { lat, lng, dist, look, depth: hi };
}

function useStars() {
  return useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(18 + Math.random() * 12);
      positions.set([v.x, v.y, v.z], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Show the first `share` of a tube (whole quads only).
function drawShare(g: THREE.BufferGeometry, share: number) {
  const total = g.index?.count ?? 0;
  g.setDrawRange(0, Math.floor((total * share) / 6) * 6);
}

// Samples per arc in the screen projection (label placement treats them as obstacles).
const ARC_SAMPLES = 32;

// A ring lying flat on the surface around a stop, at a fixed size, breathing in opacity only
// (DESIGN.md "Motion": the `PULSE` loop, no scaling rings): 100% → PULSE.min → 100% over
// two PULSE.durations, eased by a cosine so it never snaps.
const RING_OPACITY = 0.8;
function BreathingRing({
  at,
  offset,
  radius = 0.032,
}: {
  at: THREE.Vector3;
  offset: number; // seconds, so neighboring stops don't breathe in lockstep
  radius?: number;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const t = useRef(offset);

  useEffect(() => {
    ring.current?.lookAt(at.clone().multiplyScalar(2));
  }, [at]);

  useFrame((_, delta) => {
    t.current += Math.min(delta, MAX_DELTA);
    if (!ring.current) return;
    const cycle = (2 * PULSE.duration) / 1000;
    const wave = (1 + Math.cos((2 * Math.PI * t.current) / cycle)) / 2; // 1 → 0 → 1
    const level = PULSE.min + (1 - PULSE.min) * wave;
    (ring.current.material as THREE.MeshBasicMaterial).opacity = RING_OPACITY * level;
  });

  return (
    <mesh ref={ring} position={at} scale={radius}>
      <ringGeometry args={[0.8, 1, 40]} />
      <meshBasicMaterial
        color={colors.accent}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// True when `at` (on or just above the surface) is on the hemisphere facing the camera.
// Overview markers and comets skip the depth test so arcs can't bury them; this keeps
// anything on the far side from showing through the globe instead.
const scratch = new THREE.Vector3();
const facesCamera = (at: THREE.Vector3, camera: THREE.Camera) =>
  at.dot(scratch.copy(camera.position).sub(at)) > 0;

// A flat disc on the surface, facing out: overview stop markers (drawn over the arcs).
function Disc({
  at,
  radius,
  color,
  order,
}: {
  at: THREE.Vector3;
  radius: number;
  color: string;
  order: number;
}) {
  const disc = useRef<THREE.Mesh>(null);
  useEffect(() => {
    disc.current?.lookAt(at.clone().multiplyScalar(2));
  }, [at]);
  useFrame(({ camera }) => {
    if (disc.current) disc.current.visible = facesCamera(at, camera);
  });
  return (
    <mesh ref={disc} position={at} renderOrder={order}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial color={color} depthTest={false} depthWrite={false} transparent />
    </mesh>
  );
}

// A bright dot that travels along an arc once it's drawn, then rests before the next run.
const COMET_RUN_S = 2.2;
const COMET_REST_S = 1.1;
function Comet({
  curve,
  color,
  size,
  delay,
  live,
}: {
  curve: THREE.Curve<THREE.Vector3>;
  color: string;
  size: number; // world units per screen pixel
  delay: number;
  live: RefObject<boolean>;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(-delay);

  useFrame(({ camera }, delta) => {
    const g = group.current;
    if (!g) return;
    if (!live.current) {
      g.visible = false;
      return;
    }
    t.current += Math.min(delta, MAX_DELTA);
    const cycle = t.current % (COMET_RUN_S + COMET_REST_S);
    const u = cycle / COMET_RUN_S;
    if (t.current < 0 || u > 1) {
      g.visible = false;
      return;
    }
    curve.getPointAt(easeInOutCubic(u), g.position);
    g.visible = facesCamera(g.position, camera);
    const fade = Math.sin(Math.PI * u);
    g.scale.setScalar(0.6 + 0.4 * fade);
    if (halo.current) halo.current.opacity = 0.45 * fade;
  });

  return (
    <group ref={group} visible={false}>
      <mesh renderOrder={6}>
        <sphereGeometry args={[size * 3.2, 16, 12]} />
        <meshBasicMaterial color="#FFF4E8" depthTest={false} depthWrite={false} transparent />
      </mesh>
      <mesh renderOrder={5}>
        <sphereGeometry args={[size * 9, 16, 12]} />
        <meshBasicMaterial
          ref={halo}
          color={color}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function GlobeScene({
  focus,
  points,
  arcs,
  variant = "intro",
  durationMs = 2500,
  frozenAt,
  onDone,
  onFirstFrame,
  ambient = true,
  onProject,
}: GlobeProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const dpr = useThree((s) => s.viewport.dpr);
  const size = useThree((s) => s.size);
  const overview = variant === "overview";
  const hotspots = useMemo(() => points.filter((p) => p.kind === "stop"), [points]);
  const dots = useLandDots(
    hotspots.length > 0 ? hotspots : [focus],
    overview ? OVERVIEW.land : INTRO_LAND,
  );
  const stars = useStars();

  const curves = useMemo(() => arcs.map((a) => arcCurve(a, variant)), [arcs, variant]);

  // Overview framing: depends on the canvas shape, so it's redone on a resize.
  const width = size.width > 0 ? size.width : 390;
  const height = size.height > 0 ? size.height : 300;
  const fov = camera.fov ?? 50;
  const frame = useMemo(
    () => (overview ? fitRoute(points, curves, focus, width / height, fov) : null),
    [overview, points, curves, focus, width, height, fov],
  );
  // World units per screen pixel at the route's depth (overview sizes are set in pixels).
  const px = frame ? (2 * Math.tan((fov * Math.PI) / 360) * frame.depth) / height : 0;

  const tubes = useMemo(
    () =>
      curves.map((c) => ({
        core: new THREE.TubeGeometry(c, 64, overview ? OVERVIEW.arcPx * px : 0.0035, 6, false),
        glow: overview ? new THREE.TubeGeometry(c, 64, OVERVIEW.glowPx * px, 8, false) : null,
      })),
    [curves, overview, px],
  );

  const elapsed = useRef(0);
  const started = useRef(false);
  const finished = useRef(false);
  const settled = useRef(false);
  const target = useRef(new THREE.Vector3());
  const fullyDrawn = useRef<typeof tubes | null>(null);
  const projected = useRef<{ key: string; points: GlobePoint[]; curves: typeof curves } | null>(
    null,
  );
  const onProjectRef = useRef(onProject);
  onProjectRef.current = onProject;

  const focusXYZ = useMemo(() => toVec(focus, 1.004), [focus]);
  const markers = useMemo(
    () => points.map((p) => ({ kind: p.kind, at: toVec(p, 1.004) })),
    [points],
  );

  const dotUniforms = useMemo(() => ({ uSize: { value: 7 }, uPixelRatio: { value: dpr } }), [dpr]);
  // gl_PointSize is uSize / depth, so tie the dot size to the canvas height: same look in
  // the short route panel as in a full-screen intro.
  if (overview) {
    const gap = Math.sqrt((4 * Math.PI) / OVERVIEW.land.count);
    dotUniforms.uSize.value =
      (OVERVIEW.dotFill * gap * height) / (2 * Math.tan((fov * Math.PI) / 360));
  }

  // One disposal per geometry, so new arcs (a mode flip) don't throw away the land dots.
  useEffect(() => () => dots.dispose(), [dots]);
  useEffect(() => () => stars.dispose(), [stars]);
  useEffect(
    () => () => {
      for (const t of tubes) {
        t.core.dispose();
        t.glow?.dispose();
      }
    },
    [tubes],
  );

  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, MAX_DELTA) * 1000;
    const progress = frozenAt ?? clamp01(elapsed.current / durationMs);
    // One ease-out for the whole swing: no slow wind-up, no overshoot past the frame.
    const e = easeOutCubic(progress);

    if (frame) {
      // Swing in from over the Atlantic, settling over the whole route.
      camera.position.set(
        ...latLngToXYZ(lerp(16, frame.lat, e), frame.lng + 78 * (1 - e), lerp(6, frame.dist, e)),
      );
      target.current.copy(frame.look).multiplyScalar(e);
      camera.lookAt(target.current);
    } else {
      // Swing in from over the Atlantic, then dive toward the focus.
      const cam = CAMERA.intro;
      const camLat = lerp(16, focus.lat + cam.latOffset, e);
      const camLng = focus.lng + 78 * (1 - e);
      const dist = lerp(6, cam.dist, e);
      camera.position.set(...latLngToXYZ(camLat, camLng, dist));
      target.current.copy(focusXYZ).multiplyScalar(e * cam.lookIn);
      camera.lookAt(target.current);
    }

    // Draw the legs one after another inside the arc window. Once every leg is fully drawn
    // (for this set of tubes), stop touching the draw ranges.
    if (fullyDrawn.current !== tubes) {
      const win = CAMERA[variant];
      const drawn = clamp01((progress - win.arcFrom) / win.arcSpan) * tubes.length;
      for (let i = 0; i < tubes.length; i++) {
        const t = tubes[i];
        if (!t) continue;
        const share = clamp01(drawn - i);
        drawShare(t.core, share);
        if (t.glow) drawShare(t.glow, share);
      }
      if (drawn >= tubes.length) fullyDrawn.current = tubes;
    }
    settled.current = progress >= 1;

    // Report where the points and arcs landed, once settled (and again after a resize or
    // new points).
    const report = onProjectRef.current;
    if (overview && report && progress >= 1) {
      const key = `${width}x${height}`;
      const last = projected.current;
      if (last?.key !== key || last.points !== points || last.curves !== curves) {
        projected.current = { key, points, curves };
        camera.updateMatrixWorld();
        const toScreen = (at: THREE.Vector3): ScreenPoint => {
          const facing = facesCamera(at, camera);
          const v = at.clone().project(camera);
          return {
            x: ((v.x + 1) / 2) * width,
            y: ((1 - v.y) / 2) * height,
            visible: facing && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1,
          };
        };
        report({
          points: markers.map((m) => toScreen(m.at)),
          arcs: curves.map((c) => c.getSpacedPoints(ARC_SAMPLES).map(toScreen)),
        });
      }
    }

    // Only after a full frame of scene work ran without throwing (SafeGlobe's timeout).
    if (!started.current) {
      started.current = true;
      onFirstFrame?.();
    }

    if (progress >= 1 && !finished.current && frozenAt === undefined) {
      finished.current = true;
      onDone?.();
    }
  });

  const arcColor = (i: number) => (arcs[i]?.mode === "drive" ? DRIVE_ARC_COLOR : colors.accent);

  return (
    <>
      <color attach="background" args={[colors.bg]} />
      <points geometry={stars}>
        <pointsMaterial
          color="#8A7F74"
          size={1.4}
          sizeAttenuation={false}
          transparent
          opacity={0.5}
        />
      </points>
      <mesh>
        <sphereGeometry args={[1, 64, 48]} />
        <shaderMaterial args={[earthShader]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.18, 64, 48]} />
        <shaderMaterial
          args={[glowShader]}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      <points geometry={dots}>
        <shaderMaterial args={[dotShader]} uniforms={dotUniforms} transparent depthWrite={false} />
      </points>
      {tubes.map((t, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: arcs are a fixed list per trip
        <group key={i}>
          {t.glow ? (
            <mesh geometry={t.glow} renderOrder={1}>
              <meshBasicMaterial
                color={arcColor(i)}
                transparent
                opacity={0.22}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ) : null}
          <mesh geometry={t.core} renderOrder={2}>
            <meshBasicMaterial color={arcColor(i)} />
          </mesh>
        </group>
      ))}
      {overview
        ? markers.map((m, i) => {
            const r = (m.kind === "origin" ? OVERVIEW.originPx : OVERVIEW.stopPx) * px;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: points are a fixed list per trip
              <group key={i}>
                <Disc at={m.at} radius={r + OVERVIEW.outlinePx * px} color={colors.bg} order={7} />
                <Disc
                  at={m.at}
                  radius={r}
                  color={m.kind === "origin" ? colors.gold : colors.accent}
                  order={8}
                />
                {m.kind === "origin" ? (
                  // Home is a ring, not a dot: shape, not just gold vs orange, tells it apart.
                  <Disc at={m.at} radius={r * OVERVIEW.homeHole} color={colors.bg} order={9} />
                ) : null}
              </group>
            );
          })
        : markers.map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: points are a fixed list per trip
            <mesh key={i} position={m.at}>
              <sphereGeometry args={[m.kind === "origin" ? 0.009 : 0.011, 12, 12]} />
              <meshBasicMaterial color={m.kind === "origin" ? colors.gold : colors.accent} />
            </mesh>
          ))}
      {overview && !ambient
        ? null
        : markers
            .filter((m) => m.kind === "stop")
            .map((m, i) => (
              <BreathingRing
                // biome-ignore lint/suspicious/noArrayIndexKey: points are a fixed list per trip
                key={i}
                at={m.at}
                offset={i * 0.45}
                // Overview: a halo a few px outside the stop's dot (sizes are in screen px).
                radius={overview ? (OVERVIEW.stopPx + 7) * px : undefined}
              />
            ))}
      {overview && ambient
        ? curves.map((c, i) => (
            <Comet
              // biome-ignore lint/suspicious/noArrayIndexKey: arcs are a fixed list per trip
              key={i}
              curve={c}
              color={arcColor(i)}
              size={px}
              delay={i * 0.8}
              live={settled}
            />
          ))
        : null}
    </>
  );
}
