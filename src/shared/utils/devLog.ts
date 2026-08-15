/** Logs non-fatal issues during development without polluting production logs. */
export function logDevWarning(scope: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${scope}]`, error);
  }
}
