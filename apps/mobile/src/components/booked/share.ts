import * as Sharing from "expo-sharing";
import { type Icon, ShareNetwork } from "phosphor-react-native";
import type { ComponentRef, RefObject } from "react";
import { Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

// Native (Android) sharing. The web build uses share.web.ts instead, so view-shot and
// expo-sharing never get bundled for web.

// "shared" only when the platform confirms the send (web share resolving). Android can't tell
// us whether the user sent anything, so native reports "opened" and the UI stays neutral.
export type ShareResult = "shared" | "opened" | "textFallback" | "copied" | "cancelled" | "failed";

// What a ref to a <View> holds (RN 0.88 View is a function component, so not `View` itself).
export type CardRef = RefObject<ComponentRef<typeof View> | null>;

// Native has no clipboard library in the app yet, so "text" opens the system share sheet
// (Android's sheet has a Copy action).
export const textActionLabel = "Share text";
export const textActionIcon: Icon = ShareNetwork;

// Capture the card (with its solid frame) at chat-image size (1080x1350, 4:5) and open the
// share sheet with it. expo-sharing only carries a file, so the text goes out via shareText.
export async function shareCard(card: CardRef, text: string): Promise<ShareResult> {
  let uri: string;
  try {
    if (!(await Sharing.isAvailableAsync())) throw new Error("sharing unavailable");
    uri = await captureRef(card, {
      format: "png",
      width: 1080,
      height: 1350,
      result: "tmpfile",
      fileName: "huddle-plan",
    });
  } catch {
    // Couldn't make the image: still get the plan to the group as text, and say so.
    const res = await shareText(text);
    return res === "opened" ? "textFallback" : res;
  }
  try {
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Send to hackers" });
    return "opened";
  } catch {
    return "failed";
  }
}

export async function shareText(text: string): Promise<ShareResult> {
  try {
    const res = await Share.share({ message: text });
    // dismissedAction is iOS-only; on Android this always resolves as "shared".
    return res.action === Share.dismissedAction ? "cancelled" : "opened";
  } catch {
    return "failed";
  }
}
