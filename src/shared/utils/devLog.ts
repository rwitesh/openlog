import { analytics } from "@/config/analytics";

/** Logs non-fatal issues during development without polluting production logs. */
export function logDevWarning(scope: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${scope}]`, error);
  }
}

/**
 * Reports a non-fatal error the user might hit. PostHog does not autocapture
 * console output, so anything worth tracking must go through here.
 */
export function reportError(
  event: string,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  analytics.capture(event, properties);
}
