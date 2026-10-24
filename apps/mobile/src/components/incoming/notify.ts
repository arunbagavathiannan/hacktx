import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "plans";

// Posts the real heads-up notification on the phone, next to the in-app banner.
// Tapping it opens /plan/working (the notification listener track handles the tap).
// Never throws: if permission is denied or anything fails, the in-app banner still works.
// Returns the notification id so it can be dismissed if the user taps the in-app banner instead.
export async function postPlanNotification(title: string, body: string) {
  if (Platform.OS === "web") return null;
  try {
    if (Platform.OS === "android") {
      // Android 13+ only shows the permission prompt once a channel exists.
      // HIGH importance is what makes it pop up as a heads-up notification.
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Plan suggestions",
        description: "When Huddle spots a plan in your chats",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;

    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url: "/plan/working" } },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
    });
  } catch {
    return null;
  }
}

export async function dismissPlanNotification(id: string | null) {
  if (!id || Platform.OS === "web") return;
  try {
    await Notifications.dismissNotificationAsync(id);
  } catch {
    // Already gone; nothing to do.
  }
}
