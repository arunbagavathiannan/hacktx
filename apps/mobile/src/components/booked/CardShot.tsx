import { type ReactNode, type Ref, useImperativeHandle } from "react";
import { View } from "react-native";
import type { CardShotHandle } from "./CardShot.types";

// Web: react-native-view-shot needs html2canvas-pro on web (not installed), so the web build
// renders the card without capture and sharing falls back to text. Native uses CardShot.native.
export function CardShot({ ref, children }: { ref?: Ref<CardShotHandle>; children: ReactNode }) {
  useImperativeHandle(ref, () => ({ capture: async () => null }));
  return <View>{children}</View>;
}
