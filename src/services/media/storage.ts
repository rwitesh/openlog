import { Directory, File, Paths } from "expo-file-system";

import { logDevWarning } from "@/shared/utils/devLog";

function mediaDirectory(): Directory {
  return new Directory(Paths.document, "media");
}

/**
 * Resolves a stored media URI to an active durable URI.
 * Handles iOS container migration by recovering the filename if the old sandbox path is dead.
 */
export function resolveMediaUri(uri: string | undefined | null): string {
  if (!uri) return "";

  // If it's a relative filename or media path
  if (!uri.startsWith("file://") && !uri.startsWith("http://") && !uri.startsWith("https://")) {
    const filename = uri.replace(/^media\//, "");
    return new File(mediaDirectory(), filename).uri;
  }

  // If it's a file:// URI, check if it exists or if container migrated
  try {
    const file = new File(uri);
    if (file.exists) {
      return uri;
    }

    // Try recovering via filename under current media directory
    const parts = uri.split("/");
    const filename = parts[parts.length - 1];
    if (filename) {
      const recovered = new File(mediaDirectory(), filename);
      if (recovered.exists) {
        return recovered.uri;
      }
    }
  } catch {
    // Fallback to original
  }

  return uri;
}

export function resolveMediaUriList(uris: string[]): string[] {
  return uris.map(resolveMediaUri);
}

/**
 * Copies a picked/recorded file into the app's private document directory so
 * it survives app restarts (cache and picker URIs are not durable).
 */
export async function persistMedia(sourceUri: string, ext: string): Promise<string> {
  const dir = mediaDirectory();
  dir.create({ idempotent: true, intermediates: true });

  // If already in durable media directory, return as-is
  if (sourceUri.includes("/Documents/media/")) {
    return sourceUri;
  }

  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dest = new File(dir, name);

  await new File(sourceUri).copy(dest);
  return dest.uri;
}

export async function deleteMedia(uri: string | undefined | null): Promise<void> {
  if (!uri) return;

  try {
    const resolved = resolveMediaUri(uri);
    const file = new File(resolved);
    if (file.exists) file.delete();
  } catch (error) {
    logDevWarning("storage:deleteMedia", error);
  }
}

export async function deleteMediaList(uris: string[]): Promise<void> {
  await Promise.all(uris.map((uri) => deleteMedia(uri)));
}
