import { Canvas } from "@react-three/fiber/native";
import { type GlobeProps, GlobeScene } from "./GlobeScene";

// Android/iOS: react-three-fiber's native canvas, backed by expo-gl.
export function Globe(props: GlobeProps) {
  return (
    <Canvas style={{ flex: 1 }} camera={{ fov: 50, near: 0.01, far: 100, position: [0, 0, 6] }}>
      <GlobeScene {...props} />
    </Canvas>
  );
}
