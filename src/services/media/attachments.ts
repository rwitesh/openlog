import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";
import { open } from "react-native-file-viewer-turbo";

import type { Attachment } from "@/shared/types";
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
 * into cache. URIs remain ephemeral until the draft is saved.
 */
export async function pickDocuments(maxCount: number): Promise<Attachment[]> {
  if (maxCount <= 0) return [];

  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  const picked = result.assets.slice(0, maxCount);
  const attachments: Attachment[] = [];

  for (const asset of picked) {
    attachments.push({
      uri: asset.uri,
      name: asset.name || "File",
      mime: asset.mimeType,
      size: asset.size,
    });
  }

  return attachments;
}

/**
 * Copies a picked attachment into the durable media directory; its stored
 * filename replaces the ephemeral picker URI.
 */
export async function persistAttachment(attachment: Attachment): Promise<Attachment> {
  const ext = fileExtension(attachment.name, attachment.mime);
  return { ...attachment, uri: await persistMedia(attachment.uri, ext) };
}

/** Opens a kept file in the device's supported document viewer. */
export async function openAttachment(file: Attachment): Promise<void> {
  try {
    await open(file.uri, {
      displayName: file.name,
      showOpenWithDialog: true,
      showAppsSuggestions: true,
    });
  } catch (error) {
    logDevWarning("attachments:openAttachment", error);
    Alert.alert(
      "Could not open file",
      "Install or enable an app that supports this file type, then try again."
    );
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
