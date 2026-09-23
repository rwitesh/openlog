import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

/** What the device can verify the owner with right now. */
export type EnrolledAuthLevel = "none" | "passcode" | "biometrics";

/**
 * The device's owner-verification level: enrolled biometrics, a passcode-only
 * screen lock, or nothing the OS could verify against. A failed probe reports
 * "none" so the lock gate opens rather than trapping the user.
 */
export async function getEnrolledAuthLevel(): Promise<EnrolledAuthLevel> {
  if (Platform.OS === "web") return "none";

  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return "none";
    if (level === LocalAuthentication.SecurityLevel.SECRET) return "passcode";
    return "biometrics";
  } catch {
    return "none";
  }
}

/**
 * Runs the OS unlock prompt: biometrics when enrolled, with the device
 * passcode as fallback, so a failed sensor read never locks the user out.
 * @see https://docs.expo.dev/versions/latest/sdk/local-authentication/
 */
export async function authenticate(reason: string): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancel",
    });
    return result.success;
  } catch {
    return false;
  }
}
