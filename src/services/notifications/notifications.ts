import { Platform } from "react-native";
import { IS_EXPO_GO } from "@/shared/utils/appInfo";
import { logDevWarning } from "@/shared/utils/devLog";

type NotificationsModule = typeof import("expo-notifications");
let cachedModule: NotificationsModule | null = null;
let isHandlerConfigured = false;

function getNotifications(): NotificationsModule | null {
  if (IS_EXPO_GO) {
    return null;
  }

  if (!cachedModule) {
    try {
      cachedModule = require("expo-notifications") as NotificationsModule;
    } catch (error) {
      logDevWarning("notifications:require", error);
      return null;
    }
  }

  if (cachedModule && !isHandlerConfigured) {
    try {
      cachedModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      isHandlerConfigured = true;
    } catch (error) {
      logDevWarning("notifications:setHandler", error);
    }
  }

  return cachedModule;
}

/**
 * Requests notification permissions if not already granted.
 * Fully disabled in Expo Go to avoid Expo Go Android SDK 53+ module restrictions.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("backup", {
        name: "Backup & Restore",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#8B5CF6",
      });
    }

    return finalStatus === "granted";
  } catch (error) {
    logDevWarning("notifications:requestPermission", error);
    return false;
  }
}

/**
 * Dispatches an immediate local notification (disabled in Expo Go).
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null,
    });
  } catch (error) {
    logDevWarning("notifications:sendLocalNotification", error);
  }
}

/**
 * Notifies the user when an archive export has finished packing.
 */
export async function notifyBackupExportComplete(
  entryCount: number,
  mediaCount: number
): Promise<void> {
  await sendLocalNotification(
    "Backup archive saved",
    `Backup stored: ${entryCount.toLocaleString()} entries and ${mediaCount} media files packaged.`
  );
}

/**
 * Notifies the user when an archive restore completes.
 */
export async function notifyBackupImportComplete(
  importedCount: number,
  mediaCount: number
): Promise<void> {
  await sendLocalNotification(
    "Import complete",
    `Successfully restored ${importedCount.toLocaleString()} entries and ${mediaCount} media files.`
  );
}
