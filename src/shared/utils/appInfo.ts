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
 * Native application ID / bundle identifier (e.g. "com.anonymous.kizuna").
 */
export const APPLICATION_ID: string | null = Application.applicationId ?? null;
