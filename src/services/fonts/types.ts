/**
 * Canonical font types.
 *
 * The canonical font value is the actual font family name (e.g. "Inter", "Source Sans 3").
 */

export type FontName = string;

export interface FontSource {
  readonly family: FontName;
  readonly url: string;
}

export interface FontLoadResult {
  readonly success: boolean;
  readonly fontFamily: FontName;
  readonly error?: string;
}
