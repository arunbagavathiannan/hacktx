import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Reusable helper for the notification-listener track: posts the real "Plan it?" heads-up
// notification when the detector finds a plan. Nothing calls it yet. The /plan/incoming
// simulation uses only the in-app banner.
//
// Before using it, the app must:
// - call Notifications.setNotificationHandler (once, in the root layout) with
//   shouldShowBanner: true, or Android drops notifications that arrive while the app is
//   in the foreground;
// - handle taps by routing to response.notification.request.content.data.url
//   (Notifications.useLastNotificationResponse or addNotificationResponseReceivedListener);
// - ask for permission before the demo (onboarding or /preflight), so the system dialog
//   never covers the popup on stage.
// Every function here is a no-op on web and never throws.

export const PLAN_CHANNEL_ID = "plans";
// Fixed id: posting again replaces the previous suggestion instead of stacking duplicates.
export const PLAN_NOTIFICATION_ID = "plan-suggestion";

// HIGH importance is what makes Android show it as a heads-up notification. Android 13+
// only shows the permission prompt once a channel exists, so this runs first.
export async function ensurePlanChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(PLAN_CHANNEL_ID, {
      name: "Plan suggestions",
      description: "When Huddle spots a plan in your chats",
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch {
    // Channel creation failing just means the default channel is used.
  }
}

// True if notifications may be shown. Asks only if not already decided.
export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  try {
    await ensurePlanChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// Posts (or replaces) the plan suggestion. Returns false if it couldn't be shown.
export async function postPlanNotification({
  title,
  body,
  url = "/plan/working",
}: {
  title: string;
  body: string;
  url?: string;
}) {
  if (!(await requestNotificationPermission())) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: PLAN_NOTIFICATION_ID,
      content: { title, body, data: { url } },
      trigger: Platform.OS === "android" ? { channelId: PLAN_CHANNEL_ID } : null,
    });
    return true;
  } catch {
    return false;
  }
}

// Clears the suggestion from the shade, e.g. once the user opened the plan in the app.
export async function dismissPlanNotification() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissNotificationAsync(PLAN_NOTIFICATION_ID);
  } catch {
    // Already gone.
  }
}
