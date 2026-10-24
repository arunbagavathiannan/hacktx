import * as Sharing from "expo-sharing";
import type { ComponentRef, RefObject } from "react";
import { Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

// Native (Android) sharing. The web build uses share.web.ts instead, so view-shot and
// expo-sharing never get bundled for web.

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

// What a ref to a <View> holds (RN 0.88 View is a function component, so not `View` itself).
export type CardRef = RefObject<ComponentRef<typeof View> | null>;

// Native has no clipboard library in the app yet, so "text" opens the system share sheet
// (Android's sheet has a Copy action).
export const textActionLabel = "Share text";

// Capture the card at chat-image size (1080x1350, 4:5) and open the share sheet with it.
// expo-sharing only carries a file, so the text summary goes out through shareText.
export async function shareCard(card: CardRef, text: string): Promise<ShareResult> {
  try {
    if (!(await Sharing.isAvailableAsync())) return shareText(text);
    const uri = await captureRef(card, {
      format: "png",
      width: 1080,
      height: 1350,
      result: "tmpfile",
      fileName: "huddle-plan",
    });
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Send to ski bums" });
    return "shared";
  } catch {
    // Capture failed (e.g. view not laid out yet): still get the plan to the group as text.
    return shareText(text);
  }
}

export async function shareText(text: string): Promise<ShareResult> {
  try {
    const res = await Share.share({ message: text });
    return res.action === Share.dismissedAction ? "cancelled" : "shared";
  } catch {
    return "failed";
  }
}
