import { Directory, File, Paths } from "expo-file-system";

import { logDevWarning } from "@/lib/devLog";

function mediaDirectory(): Directory {
  return new Directory(Paths.document, "media");
}

/**
 * Copies a picked/recorded file into the app's private document directory so
 * it survives app restarts (cache and picker URIs are not durable).
 */
export async function persistMedia(sourceUri: string, ext: string): Promise<string> {
  const dir = mediaDirectory();
  dir.create({ idempotent: true, intermediates: true });

  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dest = new File(dir, name);

  await new File(sourceUri).copy(dest);
  return dest.uri;
}

export async function deleteMedia(uri: string | undefined | null): Promise<void> {
  if (!uri) return;

  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    logDevWarning("storage:deleteMedia", error);
  }
}

export async function deleteMediaList(uris: string[]): Promise<void> {
  await Promise.all(uris.map((uri) => deleteMedia(uri)));
}
