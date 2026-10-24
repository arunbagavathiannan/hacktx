import { Canvas } from "@react-three/fiber";
import { type GlobeProps, GlobeScene } from "./GlobeScene";

// Web build (PR screenshots, Expo web): the standard react-three-fiber canvas.
export function Globe(props: GlobeProps) {
  return (
    <Canvas
      style={{ flex: 1 }}
      dpr={[1, 2]}
      camera={{ fov: 50, near: 0.01, far: 100, position: [0, 0, 6] }}
      gl={{ antialias: true }}
    >
      <GlobeScene {...props} />
    </Canvas>
  );
}
