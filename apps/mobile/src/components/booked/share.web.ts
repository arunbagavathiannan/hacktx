import { Copy, type Icon } from "phosphor-react-native";
import type { CardRef, ShareResult } from "./share";

// Web fallback (the Expo web build used for PR screenshots). No view-shot or expo-sharing
// here: share the text with the Web Share API if the browser has it, else copy it.

export type { CardRef, ShareResult };

export const textActionLabel = "Copy text";
export const textActionIcon: Icon = Copy;

export async function shareCard(_card: CardRef, text: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      // Resolves only after the user completes the share, so "shared" is confirmed here.
      await navigator.share({ title: "Huddle plan", text });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "cancelled";
      // Share not allowed here (e.g. not HTTPS): fall through to the clipboard.
    }
  }
  return shareText(text);
}

export async function shareText(text: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
