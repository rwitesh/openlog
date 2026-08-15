import { Alert } from "react-native";
import * as Sharing from "expo-sharing";

import { logDevWarning } from "@/shared/utils/devLog";

function mimeTypeForUri(uri: string): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

/** Opens the native share sheet for a local image file. */
export async function shareImage(uri: string): Promise<void> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("Sharing unavailable", "This device cannot share photos right now.");
      return;
    }

    await Sharing.shareAsync(uri, { mimeType: mimeTypeForUri(uri) });
  } catch (error) {
    logDevWarning("share:shareImage", error);
    Alert.alert("Could not share", "Please try again.");
  }
}
