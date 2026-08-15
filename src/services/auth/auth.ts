import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

/**
 * Hardware capability snapshot for the biometric lock feature.
 * `available` is the single gate the UI should care about.
 */
export interface BiometricSupport {
  /** Hardware present AND biometrics (or a passcode) enrolled. */
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
}

const UNSUPPORTED: BiometricSupport = {
  available: false,
  hasHardware: false,
  isEnrolled: false,
};

/** Probes the device once (web is never lockable). Cheap enough to call per settings mount. */
export async function getBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === "web") return UNSUPPORTED;

  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    return {
      available: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
    };
  } catch {
    return UNSUPPORTED;
  }
}

/**
 * Runs the OS biometric prompt. Falls back to the device passcode,
 * so your entries are never locked out by a failed sensor read.
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
