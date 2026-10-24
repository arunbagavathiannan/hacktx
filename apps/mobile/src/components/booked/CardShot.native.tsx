import { type ReactNode, type Ref, useImperativeHandle, useRef } from "react";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import type { CardShotHandle } from "./CardShot.types";

// Native: wrap the share card in ViewShot so "Send" can capture it as a PNG.
export function CardShot({ ref, children }: { ref?: Ref<CardShotHandle>; children: ReactNode }) {
  const shot = useRef<ViewShotRef>(null);
  useImperativeHandle(ref, () => ({
    capture: async () => (shot.current ? shot.current.capture() : null),
  }));
  return (
    <ViewShot ref={shot} options={{ format: "png", quality: 1, result: "tmpfile" }}>
      {children}
    </ViewShot>
  );
}
