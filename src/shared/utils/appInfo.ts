import * as Application from "expo-application";
import Constants from "expo-constants";

/**
 * Native application version (e.g. "1.0.0"), queried directly from the
 * compiled binary (iOS CFBundleShortVersionString / Android versionName),
 * falling back to static `app.json` expoConfig. Null when unavailable.
 */
export const APP_VERSION: string | null =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;

/**
 * Native build number (iOS CFBundleVersion / Android versionCode).
 */
export const BUILD_NUMBER: string | null = Application.nativeBuildVersion ?? null;

/**
 * Native application ID / bundle identifier.
 */
export const APPLICATION_ID: string | null = Application.applicationId ?? null;

/**
 * Formats byte count into a human-readable string (e.g. "25.4 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
