import { Directory, File, Paths } from "expo-file-system";

import { logDevWarning } from "@/shared/utils/devLog";
import { fontNameToSlug } from "./resolver";
import type { FontName } from "./types";

function fontsDirectory(): Directory {
  return new Directory(Paths.document, "fonts");
}

function ensureDirectory(): Directory {
  const dir = fontsDirectory();
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export function getFontFile(fontName: FontName): File {
  const dir = fontsDirectory();
  const filename = `${fontNameToSlug(fontName)}.ttf`;
  return new File(dir, filename);
}

export const fontCache = {
  /**
   * Checks whether the font file exists in local storage.
   */
  has(fontName: FontName): boolean {
    try {
      const file = getFontFile(fontName);
      return file.exists;
    } catch {
      return false;
    }
  },

  /**
   * Returns the File object for the given font name, or null if it does not exist.
   */
  get(fontName: FontName): File | null {
    try {
      const file = getFontFile(fontName);
      return file.exists ? file : null;
    } catch {
      return null;
    }
  },

  /**
   * Downloads a remote font file and saves it into the local cache.
   */
  async save(fontName: FontName, url: string): Promise<File> {
    ensureDirectory();
    const dest = getFontFile(fontName);
    return File.downloadFileAsync(url, dest, { idempotent: true });
  },

  /**
   * Deletes a cached font file.
   */
  async remove(fontName: FontName): Promise<void> {
    try {
      const file = getFontFile(fontName);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      logDevWarning("fontCache:remove", error);
    }
  },

  /**
   * Clears all cached font files.
   */
  async clear(): Promise<void> {
    try {
      const dir = fontsDirectory();
      if (dir.exists) {
        dir.delete();
        ensureDirectory();
      }
    } catch (error) {
      logDevWarning("fontCache:clear", error);
    }
  },
};
