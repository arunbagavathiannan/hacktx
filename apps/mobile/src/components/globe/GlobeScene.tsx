import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { colors } from "@/theme";
import { degreesBetween, easeInOutCubic, landDots, latLngToXYZ } from "./geo";

type LatLng = { lat: number; lng: number };

export type GlobePoint = LatLng & { kind: "origin" | "stop" };
export type GlobeArc = { from: LatLng; to: LatLng; mode?: "fly" | "drive" };

export type GlobeProps = {
  focus: LatLng; // where the camera ends up looking (the destination, or the route's middle)
  points: GlobePoint[];
  arcs: GlobeArc[];
  // "intro" dives into the focus and calls onDone. "overview" settles further out so a
  // whole route fits, and stays there.
  variant?: "intro" | "overview";
  durationMs?: number;
  // Hold the zoom at this progress (0-1) instead of playing it. Used for screenshots.
  frozenAt?: number;
  onDone?: () => void;
  onFirstFrame?: () => void; // GL is up and drawing (used by SafeGlobe's timeout)
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
  overview: { dist: 1.75, latOffset: -4, lookIn: 0.85, arcFrom: 0.2, arcSpan: 0.65 },
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

function useLandDots(hotspots: LatLng[]) {
  return useMemo(() => {
    const dots = landDots(LAND_DOTS);
    const positions = new Float32Array(dots.length * 3);
    const tint = new Float32Array(dots.length * 3);
    const c = new THREE.Color();
    dots.forEach((d, i) => {
      positions.set(latLngToXYZ(d.lat, d.lng, 1.003), i * 3);
      // Land near the stops warms up to the accent color.
      const nearest = Math.min(...hotspots.map((h) => degreesBetween(d, h)));
      const heat = Math.max(0, 1 - nearest / 14);
      c.copy(DOT_COLOR).lerp(HOT_COLOR, heat * heat);
      tint.set([c.r, c.g, c.b], i * 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(tint, 3));
    return geometry;
  }, [hotspots]);
}

function arcGeometry(arc: GlobeArc) {
  const a = new THREE.Vector3(...latLngToXYZ(arc.from.lat, arc.from.lng));
  const b = new THREE.Vector3(...latLngToXYZ(arc.to.lat, arc.to.lng));
  // Drives hug the ground; flights lift off it.
  const lift = arc.mode === "drive" ? 0.008 : 0.045;
  const points: THREE.Vector3[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = a.clone().lerp(b, t).normalize();
    points.push(p.multiplyScalar(1.004 + Math.sin(Math.PI * t) * lift));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.0035, 6, false);
}

function useArcs(arcs: GlobeArc[]) {
  return useMemo(() => arcs.map(arcGeometry), [arcs]);
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

// A ring lying flat on the surface that pulses outward from a stop.
function PulseRing({ at, offset }: { at: THREE.Vector3; offset: number }) {
  const ring = useRef<THREE.Mesh>(null);
  const t = useRef(offset);

  useEffect(() => {
    ring.current?.lookAt(at.clone().multiplyScalar(2));
  }, [at]);

  useFrame((_, delta) => {
    t.current += Math.min(delta, MAX_DELTA);
    if (!ring.current) return;
    const pulse = (t.current / 1.1) % 1;
    const s = 0.02 + pulse * 0.07;
    ring.current.scale.set(s, s, s);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.8;
  });

  return (
    <mesh ref={ring} position={at}>
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

export function GlobeScene({
  focus,
  points,
  arcs,
  variant = "intro",
  durationMs = 2500,
  frozenAt,
  onDone,
  onFirstFrame,
}: GlobeProps) {
  const camera = useThree((s) => s.camera);
  const dpr = useThree((s) => s.viewport.dpr);
  const hotspots = useMemo(() => points.filter((p) => p.kind === "stop"), [points]);
  const dots = useLandDots(hotspots.length > 0 ? hotspots : [focus]);
  const arcGeometries = useArcs(arcs);
  const stars = useStars();

  const elapsed = useRef(0);
  const started = useRef(false);
  const finished = useRef(false);
  const target = useRef(new THREE.Vector3());
  const cam = CAMERA[variant];

  const focusXYZ = useMemo(
    () => new THREE.Vector3(...latLngToXYZ(focus.lat, focus.lng, 1.004)),
    [focus],
  );
  const markers = useMemo(
    () =>
      points.map((p) => ({
        kind: p.kind,
        at: new THREE.Vector3(...latLngToXYZ(p.lat, p.lng, 1.004)),
      })),
    [points],
  );

  const dotUniforms = useMemo(() => ({ uSize: { value: 7 }, uPixelRatio: { value: dpr } }), [dpr]);

  // One disposal per geometry, so new arcs (a mode flip) don't throw away the land dots.
  useEffect(() => () => dots.dispose(), [dots]);
  useEffect(() => () => stars.dispose(), [stars]);
  useEffect(
    () => () => {
      for (const g of arcGeometries) g.dispose();
    },
    [arcGeometries],
  );

  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, MAX_DELTA) * 1000;
    const progress = frozenAt ?? clamp01(elapsed.current / durationMs);
    const e = easeInOutCubic(progress);

    // Swing in from over the Atlantic, then dive toward the focus.
    const camLat = lerp(16, focus.lat + cam.latOffset, e);
    const camLng = focus.lng + 78 * (1 - e);
    const dist = lerp(6, cam.dist, e);
    camera.position.set(...latLngToXYZ(camLat, camLng, dist));
    target.current.copy(focusXYZ).multiplyScalar(e * cam.lookIn);
    camera.lookAt(target.current);

    // Draw the legs one after another inside the arc window.
    const drawn = clamp01((progress - cam.arcFrom) / cam.arcSpan) * arcGeometries.length;
    arcGeometries.forEach((g, i) => {
      const total = g.index?.count ?? 0;
      const share = clamp01(drawn - i);
      g.setDrawRange(0, Math.floor((total * share) / 6) * 6);
    });

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
      {arcGeometries.map((g, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: arcs are a fixed list per trip
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={arcs[i]?.mode === "drive" ? DRIVE_ARC_COLOR : colors.accent} />
        </mesh>
      ))}
      {markers.map((m, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: points are a fixed list per trip
        <mesh key={i} position={m.at}>
          <sphereGeometry args={[m.kind === "origin" ? 0.009 : 0.011, 12, 12]} />
          <meshBasicMaterial color={m.kind === "origin" ? colors.gold : colors.accent} />
        </mesh>
      ))}
      {markers
        .filter((m) => m.kind === "stop")
        .map((m, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: points are a fixed list per trip
          <PulseRing key={i} at={m.at} offset={i * 0.45} />
        ))}
    </>
  );
}
