import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

const CHANNEL = "plans";
const TAP_ROUTE = "/plan/working";

// Real local heads-up notification for the simulated plan (native only; the web build used
// for screenshots shows just the in-app banner). Asks permission first and swallows every
// failure so the demo never breaks on a denied permission or an emulator quirk.
export async function showPlanNotification(title: string, body: string) {
  if (Platform.OS === "web") return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    if (Platform.OS === "android") {
      // HIGH importance is what makes Android show it as a heads-up popup.
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "Plans Huddle spots",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url: TAP_ROUTE } },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
    });
  } catch {
    // Ignore: the in-app banner already covers the moment.
  }
}

// Tapping the system notification opens the agent timeline, same as "Plan it".
// Pass a stable function (module-level), or the listener re-subscribes every render.
export function usePlanNotificationTap(onTap: () => void) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        if (response.notification.request.content.data?.url === TAP_ROUTE) onTap();
      });
      return () => sub.remove();
    } catch {
      return;
    }
  }, [onTap]);
}
