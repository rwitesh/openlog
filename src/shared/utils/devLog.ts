import { analytics } from "@/config/analytics";
import { IS_EXPO_GO } from "./appInfo";

/** Logs non-fatal issues during development without polluting production logs. */
export function logDevWarning(scope: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${scope}]`, error);
  }
}

/**
 * Reports a non-fatal error the user might hit. In Expo Go it only logs to
 * the console; any installed build captures a PostHog event. PostHog does not
 * autocapture console output, so anything worth tracking must go through here.
 */
export function reportError(
  event: string,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  if (IS_EXPO_GO) {
    console.warn(`[${event}]`, JSON.stringify(properties));
    return;
  }
  analytics.capture(event, properties);
}
