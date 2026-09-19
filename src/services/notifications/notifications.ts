import { Platform } from "react-native";
import { analytics } from "@/config/analytics";
import { formatBytes } from "@/shared/utils/appInfo";
import { logDevWarning } from "@/shared/utils/devLog";

type NotificationsModule = typeof import("expo-notifications");
let cachedModule: NotificationsModule | null = null;
let isHandlerConfigured = false;

function getNotifications(): NotificationsModule | null {
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

/** Requests notification permission if not granted; the OS itself never re-prompts after a decision. */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // The OS shows the dialog only while undecided, so repeated calls never nag.
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      if (existingStatus === "undetermined") {
        analytics.capture("notification_permission_prompted", {
          granted: status === "granted",
        });
      }
      finalStatus = status;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("backup", {
        name: "Backup & Restore",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#8B5CF6",
      });
      await Notifications.setNotificationChannelAsync("backup-progress", {
        name: "Backup & Restore Progress",
        importance: Notifications.AndroidImportance.LOW,
        enableVibrate: false,
        sound: null,
      });
    }

    return finalStatus === "granted";
  } catch (error) {
    logDevWarning("notifications:requestPermission", error);
    return false;
  }
}

/**
 * Dispatches an immediate local notification.
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

const BACKUP_NOTIFICATION_ID = "openlog-backup-progress";

/**
 * Shows or updates an ongoing notification in the notification bar while backup/restore is in progress.
 */
export async function notifyBackupProgress(title: string, body: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: BACKUP_NOTIFICATION_ID,
      content: {
        title,
        body,
        sound: false,
        sticky: true,
        autoDismiss: false,
      },
      trigger: Platform.OS === "android" ? { channelId: "backup-progress" } : null,
    });
  } catch (error) {
    logDevWarning("notifications:notifyBackupProgress", error);
  }
}

/**
 * Dismisses the ongoing backup/restore notification (e.g. on cancellation).
 */
export async function dismissBackupProgressNotification(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.dismissNotificationAsync(BACKUP_NOTIFICATION_ID);
  } catch (error) {
    logDevWarning("notifications:dismissBackupProgress", error);
  }
}

/**
 * Notifies the user when an archive export has completed packing and saving.
 */
export async function notifyBackupExportComplete(
  entryCount: number,
  byteSize?: number
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const sizeText = byteSize ? ` (${formatBytes(byteSize)})` : "";
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: BACKUP_NOTIFICATION_ID,
      content: {
        title: "Backup saved",
        body: `${entryCount.toLocaleString()} ${entryCount === 1 ? "entry" : "entries"}${sizeText}.`,
        sound: true,
        sticky: false,
        autoDismiss: true,
      },
      trigger: Platform.OS === "android" ? { channelId: "backup" } : null,
    });
  } catch (error) {
    logDevWarning("notifications:notifyBackupExportComplete", error);
  }
}

/**
 * Notifies the user when an archive restore has completed.
 */
export async function notifyBackupImportComplete(importedCount: number): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: BACKUP_NOTIFICATION_ID,
      content: {
        title: "Backup restored",
        body: `${importedCount.toLocaleString()} ${importedCount === 1 ? "entry" : "entries"} restored.`,
        sound: true,
        sticky: false,
        autoDismiss: true,
      },
      trigger: Platform.OS === "android" ? { channelId: "backup" } : null,
    });
  } catch (error) {
    logDevWarning("notifications:notifyBackupImportComplete", error);
  }
}

/**
 * Notifies the user when an archive export or restore operation fails.
 */
export async function notifyBackupError(title: string, body: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: BACKUP_NOTIFICATION_ID,
      content: {
        title,
        body,
        sound: true,
        sticky: false,
        autoDismiss: true,
      },
      trigger: Platform.OS === "android" ? { channelId: "backup" } : null,
    });
  } catch (error) {
    logDevWarning("notifications:notifyBackupError", error);
  }
}
