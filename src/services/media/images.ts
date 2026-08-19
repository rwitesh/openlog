import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { logDevWarning } from "@/shared/utils/devLog";

/** Longest allowed edge for stored photos — raw camera resolution would bloat storage. */
export const IMAGE_MAX_DIMENSION = 1920;

/** JPEG quality used when re-encoding stored photos. */
export const IMAGE_JPEG_QUALITY = 0.8;

/**
 * Downscale a photo so its longest edge fits IMAGE_MAX_DIMENSION, re-encoded as JPEG.
 * Images already within bounds (and any failure) return the original URI.
 */
export async function downscaleImage(
  uri: string,
  knownDimensions?: { width?: number | null; height?: number | null }
): Promise<string> {
  try {
    let { width, height } = knownDimensions ?? {};

    // Picker assets carry dimensions; probe only when missing.
    if (!width || !height) {
      const probe = await ImageManipulator.manipulate(uri).renderAsync();
      width = probe.width;
      height = probe.height;
    }

    const longestEdge = Math.max(width ?? 0, height ?? 0);
    if (!longestEdge || longestEdge <= IMAGE_MAX_DIMENSION) {
      return uri;
    }

    // Resize by the longest edge; the other dimension keeps its ratio.
    const resize =
      (width ?? 0) >= (height ?? 0)
        ? { width: IMAGE_MAX_DIMENSION }
        : { height: IMAGE_MAX_DIMENSION };

    const rendered = await ImageManipulator.manipulate(uri).resize(resize).renderAsync();
    const saved = await rendered.saveAsync({
      compress: IMAGE_JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    return saved.uri;
  } catch (error) {
    logDevWarning("media:downscaleImage", error);
    return uri;
  }
}
