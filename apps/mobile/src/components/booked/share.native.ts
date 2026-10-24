import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { trip } from "@/mocks";

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

const title = `Send to ${trip.sourceChat.name}`;

// Native: capture the card and open the share sheet with the image. If capture or the file
// share sheet isn't available, share the text summary instead so the button never dead-ends.
export async function sendPlan(
  capture: () => Promise<string | null>,
  text: string,
): Promise<ShareResult> {
  try {
    const uri = await capture();
    if (uri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: title,
      });
      return "shared";
    }
  } catch {
    // fall through to text
  }
  return shareTextOnly(text);
}

// expo-clipboard isn't installed, so on native "copy" goes through the text share sheet
// (Android and iOS both offer Copy there).
export async function copyPlanText(text: string): Promise<ShareResult> {
  return shareTextOnly(text);
}

async function shareTextOnly(text: string): Promise<ShareResult> {
  try {
    const res = await Share.share({ message: text, title }, { dialogTitle: title });
    return res.action === Share.dismissedAction ? "cancelled" : "shared";
  } catch {
    return "failed";
  }
}
