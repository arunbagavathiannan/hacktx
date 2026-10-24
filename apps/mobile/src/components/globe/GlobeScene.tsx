import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { colors } from "@/theme";
import { degreesBetween, easeInOutCubic, landDots, latLngToXYZ } from "./geo";

type LatLng = { lat: number; lng: number };

export type GlobeProps = {
  destination: LatLng;
  origin: LatLng;
  durationMs?: number;
  // Hold the zoom at this progress (0-1) instead of playing it. Used for screenshots.
  frozenAt?: number;
  onDone?: () => void;
};

// Shared three.js scene for Globe.web.tsx and Globe.native.tsx. Low-poly, no textures:
// a dark sphere, dotted land, a sunset rim glow, and an arc from origin to destination.

const LAND_DOTS = 16000;
const DOT_COLOR = new THREE.Color("#6B5E52");
const HOT_COLOR = new THREE.Color(colors.accent);

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

function useLandDots(destination: LatLng) {
  return useMemo(() => {
    const dots = landDots(LAND_DOTS);
    const positions = new Float32Array(dots.length * 3);
    const tint = new Float32Array(dots.length * 3);
    const c = new THREE.Color();
    dots.forEach((d, i) => {
      positions.set(latLngToXYZ(d.lat, d.lng, 1.003), i * 3);
      // Land near the destination warms up to the accent color.
      const heat = Math.max(0, 1 - degreesBetween(d, destination) / 14);
      c.copy(DOT_COLOR).lerp(HOT_COLOR, heat * heat);
      tint.set([c.r, c.g, c.b], i * 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(tint, 3));
    return geometry;
  }, [destination]);
}

function useArc(origin: LatLng, destination: LatLng) {
  return useMemo(() => {
    const a = new THREE.Vector3(...latLngToXYZ(origin.lat, origin.lng));
    const b = new THREE.Vector3(...latLngToXYZ(destination.lat, destination.lng));
    const points: THREE.Vector3[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = a.clone().lerp(b, t).normalize();
      points.push(p.multiplyScalar(1.004 + Math.sin(Math.PI * t) * 0.045));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.0035, 6, false);
  }, [origin, destination]);
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

export function GlobeScene({
  destination,
  origin,
  durationMs = 2500,
  frozenAt,
  onDone,
}: GlobeProps) {
  const camera = useThree((s) => s.camera);
  const dpr = useThree((s) => s.viewport.dpr);
  const dots = useLandDots(destination);
  const arc = useArc(origin, destination);
  const stars = useStars();

  const elapsed = useRef(0);
  const finished = useRef(false);
  const ring = useRef<THREE.Mesh>(null);
  const target = useRef(new THREE.Vector3());

  const dest = useMemo(
    () => new THREE.Vector3(...latLngToXYZ(destination.lat, destination.lng, 1.004)),
    [destination],
  );
  const from = useMemo(
    () => new THREE.Vector3(...latLngToXYZ(origin.lat, origin.lng, 1.004)),
    [origin],
  );

  const dotUniforms = useMemo(() => ({ uSize: { value: 7 }, uPixelRatio: { value: dpr } }), [dpr]);

  // The pulse ring lies flat on the surface at the destination.
  useEffect(() => {
    ring.current?.lookAt(dest.clone().multiplyScalar(2));
  }, [dest]);

  useEffect(
    () => () => {
      dots.dispose();
      arc.dispose();
      stars.dispose();
    },
    [dots, arc, stars],
  );

  useFrame((_, delta) => {
    elapsed.current += delta * 1000;
    const progress = frozenAt ?? clamp01(elapsed.current / durationMs);
    const e = easeInOutCubic(progress);

    // Swing in from over the Atlantic, then dive toward the destination.
    const camLat = lerp(16, destination.lat - 9, e);
    const camLng = destination.lng + 78 * (1 - e);
    const dist = lerp(6, 1.6, e);
    camera.position.set(...latLngToXYZ(camLat, camLng, dist));
    target.current.copy(dest).multiplyScalar(e * 0.6);
    camera.lookAt(target.current);

    // Draw the arc between 30% and 80% of the zoom.
    const drawn = clamp01((progress - 0.3) / 0.5);
    const total = arc.index?.count ?? 0;
    arc.setDrawRange(0, Math.floor((total * drawn) / 6) * 6);

    if (ring.current) {
      const pulse = (elapsed.current / 1100) % 1;
      const s = 0.02 + pulse * 0.07;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.8;
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
      <mesh geometry={arc}>
        <meshBasicMaterial color={colors.accent} />
      </mesh>
      <mesh position={from}>
        <sphereGeometry args={[0.009, 12, 12]} />
        <meshBasicMaterial color={colors.gold} />
      </mesh>
      <mesh position={dest}>
        <sphereGeometry args={[0.011, 12, 12]} />
        <meshBasicMaterial color={colors.accent} />
      </mesh>
      <mesh ref={ring} position={dest}>
        <ringGeometry args={[0.8, 1, 40]} />
        <meshBasicMaterial
          color={colors.accent}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
