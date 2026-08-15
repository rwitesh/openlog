import * as Font from "expo-font";

import { logDevWarning } from "@/shared/utils/devLog";
import { DEFAULT_FONT, getFonts, hasFont } from "./catalog";
import { fontCache, getFontFile } from "./cache";
import { resolveFontSource } from "./resolver";
import type { FontLoadResult, FontName } from "./types";

class FontManager {
  private inFlightLoads = new Map<string, Promise<FontLoadResult>>();

  /**
   * Returns all available font family names in the catalog.
   */
  getFonts(): readonly FontName[] {
    return getFonts();
  }

  /**
   * Checks whether a font name is present in the catalog.
   */
  hasFont(fontName: string): boolean {
    return hasFont(fontName);
  }

  /**
   * The default, reliably bundled bootstrap font.
   */
  getDefaultFont(): FontName {
    return DEFAULT_FONT;
  }

  /**
   * Synchronously checks if a font is already loaded and ready for rendering.
   * Default font ("Source Sans 3") is always considered loaded via app bundle.
   */
  isLoaded(fontName: FontName): boolean {
    if (fontName === DEFAULT_FONT) {
      return true;
    }
    return Font.isLoaded(fontName);
  }

  /**
   * Checks whether the font file is downloaded and cached locally.
   */
  isCached(fontName: FontName): boolean {
    if (fontName === DEFAULT_FONT) {
      return true;
    }
    return fontCache.has(fontName);
  }

  /**
   * Loads a font by canonical family name.
   *
   * Coordinates:
   *   1. Deduplication of concurrent in-flight requests.
   *   2. Cache lookup.
   *   3. On-demand downloading.
   *   4. expo-font registration.
   *   5. Auto-recovery from corrupt cache files.
   *   6. Fallback to Source Sans 3 on failure.
   */
  async load(fontName: FontName): Promise<FontLoadResult> {
    // 1. Validation against catalog
    if (!hasFont(fontName)) {
      return {
        success: false,
        fontFamily: DEFAULT_FONT,
        error: `Font "${fontName}" does not exist in catalog.`,
      };
    }

    // 2. Default font is bundled
    if (fontName === DEFAULT_FONT) {
      return { success: true, fontFamily: DEFAULT_FONT };
    }

    // 3. Already loaded in React Native font system
    if (Font.isLoaded(fontName)) {
      return { success: true, fontFamily: fontName };
    }

    // 4. Deduplicate concurrent in-flight requests
    const existingPromise = this.inFlightLoads.get(fontName);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = this.executeLoad(fontName);
    this.inFlightLoads.set(fontName, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.inFlightLoads.delete(fontName);
    }
  }

  /**
   * Preloads a font in the background without blocking.
   */
  async preload(fontName: FontName): Promise<FontLoadResult> {
    return this.load(fontName);
  }

  /**
   * Removes a font file from the local cache.
   */
  async remove(fontName: FontName): Promise<void> {
    await fontCache.remove(fontName);
  }

  /**
   * Clears the entire font cache.
   */
  async clearCache(): Promise<void> {
    await fontCache.clear();
  }

  private async executeLoad(fontName: FontName): Promise<FontLoadResult> {
    // If cached, try loading the cached file first
    if (fontCache.has(fontName)) {
      try {
        const file = getFontFile(fontName);
        await Font.loadAsync({ [fontName]: file.uri });
        return { success: true, fontFamily: fontName };
      } catch (error) {
        logDevWarning(`fontManager:cachedLoadFailed (${fontName}) - invalidating cache`, error);
        // Invalidate corrupt cache file and attempt fresh download below
        await fontCache.remove(fontName);
      }
    }

    // Download from remote font source
    try {
      const source = resolveFontSource(fontName);
      const savedFile = await fontCache.save(fontName, source.url);
      await Font.loadAsync({ [fontName]: savedFile.uri });
      return { success: true, fontFamily: fontName };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logDevWarning(`fontManager:downloadOrLoadFailed (${fontName})`, error);
      return {
        success: false,
        fontFamily: DEFAULT_FONT,
        error: errorMessage,
      };
    }
  }
}

export const fontManager = new FontManager();
