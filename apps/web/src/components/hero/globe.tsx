"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { CHATS } from "./chats";
import { isLand } from "./land";

// Dotted globe with a fresnel atmosphere (the look popularised by GitHub's homepage globe),
// built on three's own addons: OrbitControls for drag + auto-rotate, CSS2DRenderer for the
// chat bubbles. Each bubble pops up over its city, then collapses into a 3D pin, and an arc
// links it to the previous pin.

const CORAL = new THREE.Color("#ff5a36");
const CREAM = new THREE.Color("#f4ece1");
const AMBER = new THREE.Color("#ff8a4c");

const DOT_SAMPLES = 26000;
const SPAWN_MS = 2600;
const BUBBLE_MS = 2300;
const PIN_MS = 11000;
const FADE_MS = 700;
const PIN_HEIGHT = 0.09;

type Phase = "idle" | "bubble" | "pin" | "fading";

function toVec3(lat: number, lng: number, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function landDots() {
  const positions: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOT_SAMPLES; i++) {
    const y = 1 - (2 * (i + 0.5)) / DOT_SAMPLES;
    const lat = THREE.MathUtils.radToDeg(Math.asin(y));
    const lng = THREE.MathUtils.radToDeg((i * golden) % (2 * Math.PI)) - 180;
    if (isLand(lat, lng)) positions.push(...toVec3(lat, lng, 1.003).toArray());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function chatElement(chat: (typeof CHATS)[number]) {
  const root = document.createElement("div");
  root.className = "globe-chat";
  root.dataset.phase = "idle";

  const bubble = document.createElement("div");
  bubble.className = "globe-chat__bubble";
  const meta = document.createElement("span");
  meta.className = "globe-chat__meta";
  const sender = document.createElement("b");
  sender.textContent = chat.sender;
  meta.append(sender, ` · ${chat.app}`);
  const text = document.createElement("span");
  text.className = "globe-chat__text";
  text.textContent = chat.text;
  bubble.append(meta, text);

  const chip = document.createElement("div");
  chip.className = "globe-chat__chip";
  chip.textContent = chat.city;

  root.append(bubble, chip);
  return { root, bubble };
}

const EDGE_GAP = 12;
const TAIL = 10;

// Bubbles grow right from their city by default. Near the right edge of the page they flip to
// grow left, and if neither side fits they slide until they do, so they never clip.
function placeBubble(bubble: HTMLElement, anchorX: number, viewportWidth: number) {
  const width = bubble.offsetWidth;
  const fitsRight = anchorX - TAIL + width <= viewportWidth - EDGE_GAP;
  const fitsLeft = anchorX + TAIL - width >= EDGE_GAP;
  const side = fitsRight || !fitsLeft ? "right" : "left";
  let left = side === "right" ? anchorX - TAIL : anchorX + TAIL - width;
  left = Math.min(left, viewportWidth - EDGE_GAP - width);
  left = Math.max(left, EDGE_GAP);
  bubble.dataset.side = side;
  bubble.style.left = `${left - anchorX}px`;
  bubble.style.transformOrigin = `${anchorX - left}px 100%`;
}

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "globe-canvas";
    container.append(renderer.domElement);

    const labels = new CSS2DRenderer();
    labels.domElement.className = "globe-labels";
    container.append(labels.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    // Start over the Americas, tilted a little north.
    camera.position.copy(toVec3(22, -92, 4.6));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.rotateSpeed = 0.5;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.55;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.62;

    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    // Ocean: dark sphere with a warm rim so the silhouette reads against the page.
    const globe = new THREE.Mesh(
      track(new THREE.SphereGeometry(1, 96, 96)),
      track(
        new THREE.ShaderMaterial({
          uniforms: { uBase: { value: new THREE.Color("#16120f") }, uRim: { value: AMBER } },
          vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vView = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uBase;
            uniform vec3 uRim;
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.0);
              gl_FragColor = vec4(mix(uBase, uRim, rim * 0.45), 1.0);
            }`,
        }),
      ),
    );
    scene.add(globe);

    // Land as round, crisp points that fade toward the edge of the globe.
    const dots = new THREE.Points(
      track(landDots()),
      track(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: {
            uColor: { value: CREAM },
            uSize: { value: 2.6 * renderer.getPixelRatio() },
          },
          vertexShader: /* glsl */ `
            uniform float uSize;
            varying float vFacing;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vFacing = dot(normalize(normalMatrix * position), normalize(-mv.xyz));
              gl_PointSize = uSize * (4.6 / -mv.z);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying float vFacing;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              if (d > 0.5) discard;
              float edge = smoothstep(0.5, 0.35, d);
              float alpha = edge * mix(0.12, 0.78, smoothstep(0.0, 0.6, vFacing));
              gl_FragColor = vec4(uColor, alpha);
            }`,
        }),
      ),
    );
    scene.add(dots);

    // Atmosphere: back-face fresnel shell, additive.
    const atmosphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(1.16, 64, 64)),
      track(
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uColor: { value: AMBER } },
          vertexShader: /* glsl */ `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying vec3 vNormal;
            void main() {
              float i = pow(max(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
              gl_FragColor = vec4(uColor, i * 1.6);
            }`,
        }),
      ),
    );
    scene.add(atmosphere);

    // Shared pin parts.
    const stemGeometry = track(new THREE.CylinderGeometry(0.0035, 0.0035, PIN_HEIGHT, 8));
    stemGeometry.translate(0, PIN_HEIGHT / 2, 0);
    const headGeometry = track(new THREE.SphereGeometry(0.019, 24, 24));
    const ringGeometry = track(new THREE.RingGeometry(0.018, 0.024, 48));
    const up = new THREE.Vector3(0, 1, 0);

    const cities = CHATS.map((chat) => {
      const normal = toVec3(chat.lat, chat.lng);
      const pin = new THREE.Group();
      pin.position.copy(normal);
      pin.quaternion.setFromUnitVectors(up, normal);

      const pinMaterial = track(new THREE.MeshBasicMaterial({ color: CORAL, transparent: true }));
      const stem = new THREE.Mesh(stemGeometry, pinMaterial);
      const head = new THREE.Mesh(headGeometry, pinMaterial);
      head.position.y = PIN_HEIGHT;
      const ringMaterial = track(
        new THREE.MeshBasicMaterial({
          color: CORAL,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.002;
      pin.add(stem, head, ring);
      pin.scale.setScalar(0);
      scene.add(pin);

      const { root: element, bubble } = chatElement(chat);
      const label = new CSS2DObject(element);
      label.position.copy(normal.clone().multiplyScalar(1 + PIN_HEIGHT + 0.03));
      scene.add(label);

      return {
        chat,
        normal,
        pin,
        pinMaterial,
        ring,
        ringMaterial,
        element,
        bubble,
        label,
        phase: "idle" as Phase,
        since: 0,
      };
    });
    type City = (typeof cities)[number];

    type Arc = { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; to: City; born: number };
    const arcs: Arc[] = [];

    function addArc(from: City, to: City, now: number) {
      const a = from.normal;
      const b = to.normal;
      const lift = 1 + a.distanceTo(b) * 0.45;
      const curve = new THREE.CubicBezierCurve3(
        a.clone(),
        a.clone().lerp(b, 0.25).normalize().multiplyScalar(lift),
        a.clone().lerp(b, 0.75).normalize().multiplyScalar(lift),
        b.clone(),
      );
      const geometry = new THREE.TubeGeometry(curve, 80, 0.0032, 6, false);
      geometry.setDrawRange(0, 0);
      const material = new THREE.MeshBasicMaterial({
        color: CORAL,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      arcs.push({ mesh, material, to, born: now });
    }

    function removeArc(arc: Arc) {
      scene.remove(arc.mesh);
      arc.mesh.geometry.dispose();
      arc.material.dispose();
      arcs.splice(arcs.indexOf(arc), 1);
    }

    let lastPinned: City | null = null;
    let lastSpawn = -Infinity;
    const cameraDir = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const facing = (city: City) => city.normal.dot(cameraDir);

    function setPhase(city: City, phase: Phase, now: number) {
      city.phase = phase;
      city.since = now;
      city.element.dataset.phase = phase;
    }

    function spawn(now: number) {
      // Pick the idle city closest to the middle of the visible face.
      let best: City | null = null;
      for (const city of cities) {
        if (city.phase !== "idle" || facing(city) < 0.45) continue;
        if (!best || facing(city) > facing(best)) best = city;
      }
      if (!best) return;
      setPhase(best, "bubble", now);
      lastSpawn = now;
    }

    function update(now: number) {
      cameraDir.copy(camera.position).normalize();
      if (now - lastSpawn > SPAWN_MS) spawn(now);

      let bounds: DOMRect | null = null;
      for (const city of cities) {
        if (city.phase === "bubble") {
          bounds ??= (container as HTMLDivElement).getBoundingClientRect();
          projected.copy(city.label.position).project(camera);
          const anchorX = bounds.left + ((projected.x + 1) / 2) * bounds.width;
          placeBubble(city.bubble, anchorX, document.documentElement.clientWidth);
        }

        const age = now - city.since;
        if (city.phase === "bubble" && age > BUBBLE_MS) {
          setPhase(city, "pin", now);
          if (lastPinned && lastPinned !== city && lastPinned.phase === "pin") {
            addArc(lastPinned, city, now);
          }
          lastPinned = city;
        } else if (city.phase === "pin" && age > PIN_MS) {
          setPhase(city, "fading", now);
        } else if (city.phase === "fading" && age > FADE_MS) {
          setPhase(city, "idle", now);
        }

        const t = now - city.since;
        if (city.phase === "pin") {
          city.pin.scale.setScalar(easeOutBack(clamp01(t / 650)));
          city.pinMaterial.opacity = 1;
          const pulse = (t % 1800) / 1800;
          city.ring.scale.setScalar(1 + pulse * 2.6);
          city.ringMaterial.opacity = (1 - pulse) * 0.7;
        } else if (city.phase === "fading") {
          const k = 1 - clamp01(t / FADE_MS);
          city.pinMaterial.opacity = k;
          city.ringMaterial.opacity = 0;
        } else if (city.phase === "idle") {
          city.pin.scale.setScalar(0);
        }

        city.element.classList.toggle("is-behind", facing(city) < 0.12);
      }

      for (const arc of [...arcs]) {
        const index = arc.mesh.geometry.index;
        const total = index ? index.count : 0;
        const grow = easeInOut(clamp01((now - arc.born) / 1100));
        arc.mesh.geometry.setDrawRange(0, Math.floor((total * grow) / 6) * 6);
        if (arc.to.phase === "fading") {
          arc.material.opacity = 0.85 * (1 - clamp01((now - arc.to.since) / FADE_MS));
        } else if (arc.to.phase === "idle") {
          removeArc(arc);
        }
      }
    }

    function resize() {
      const { clientWidth: width, clientHeight: height } = container as HTMLDivElement;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      labels.setSize(width, height);
      camera.aspect = width / height;
      // Keep the globe plus its glow inside the frame on tall or narrow layouts.
      const fit = 1.32 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.setLength(camera.aspect < 1 ? fit / camera.aspect : fit);
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frame = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      controls.update();
      update(now);
      renderer.render(scene, camera);
      labels.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);
    container.dataset.ready = "true";

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      for (const arc of [...arcs]) removeArc(arc);
      for (const item of disposables) item.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.domElement.remove();
      delete container.dataset.ready;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="globe"
      role="img"
      aria-label="A globe where group-chat messages about trips turn into location pins"
    />
  );
}
