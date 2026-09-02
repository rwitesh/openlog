import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

import type { Attachment } from "@/shared/types";
import { IS_EXPO_GO } from "@/shared/utils/appInfo";
import { logDevWarning } from "@/shared/utils/devLog";
import { persistMedia } from "./storage";

/** Derives a safe extension from a filename or mime type; `bin` as the last resort. */
function fileExtension(name: string, mime?: string): string {
  const ext = name.includes(".") ? (name.split(".").pop() ?? "") : "";
  if (ext && /^[a-zA-Z0-9]{1,8}$/.test(ext)) return ext.toLowerCase();
  const mimeExt = mime?.split("/").pop();
  if (mimeExt && /^[a-zA-Z0-9]{1,8}$/.test(mimeExt)) return mimeExt.toLowerCase();
  return "bin";
}

/**
 * Opens the system document picker for any file type and copies each selection
 * into the app's durable media directory. Returns an empty list on cancel.
 */
export async function pickDocuments(maxCount: number): Promise<Attachment[]> {
  if (maxCount <= 0) return [];

  // Expo Go sandboxes file access per experience while the system document picker
  // hands back a URI from the global cache it cannot read — a development/prod
  // build has one sandbox and works. Say so instead of failing silently.
  if (IS_EXPO_GO) {
    Alert.alert(
      "Not available in Expo Go",
      Platform.OS === "android"
        ? "Attaching files needs the OpenLog development build on this device."
        : "Attaching files needs the OpenLog development build."
    );
    return [];
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  const picked = result.assets.slice(0, maxCount);
  const attachments: Attachment[] = [];

  for (const asset of picked) {
    try {
      const uri = await persistMedia(asset.uri, fileExtension(asset.name, asset.mimeType));
      attachments.push({
        uri,
        name: asset.name || "File",
        mime: asset.mimeType,
        size: asset.size,
      });
    } catch (error) {
      logDevWarning("attachments:pickDocuments", error);
    }
  }

  return attachments;
}

/** Opens a kept file with the system share sheet, which offers preview and "Open in" targets. */
export async function openAttachment(file: Attachment): Promise<void> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("Cannot open file", "This device cannot open this file type.");
      return;
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: file.mime || "application/octet-stream",
      ...(file.name ? { fileName: file.name } : {}),
    });
  } catch (error) {
    logDevWarning("attachments:openAttachment", error);
    Alert.alert("Could not open file", "Please try again.");
  }
}

/** Human-readable byte size for attachment chips, e.g. "1.4 MB". */
export function formatAttachmentSize(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
