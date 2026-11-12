import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

import { reportError } from "@/shared/utils/devLog";

function mimeTypeForUri(uri: string): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "image/tiff";
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
    reportError("media:shareImage", error);
    Alert.alert("Could not share", "Try again.");
  }
}
