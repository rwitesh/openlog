import { posthog } from "@/config/posthog";

/** Logs expected, best-effort failures during development only. */
export function logDevWarning(scope: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${scope}]`, error);
  }
}

// A URI or an absolute path with at least two segments, through the end of the line.
const PATH_PATTERN = /(^|[\s"'(=])(?:[a-z][a-z\d+.-]*:\/\/|\/[^\s/]+\/)[^\n]*/gim;

/** File paths can contain attachment names, so a message keeps only the text before its first path. */
function redactPaths(text: string): string {
  return text.replace(PATH_PATTERN, "$1<path>");
}

function toReportableError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error(redactPaths(String(error)));
  const message = redactPaths(error.message);
  const reportable = new Error(message);
  reportable.name = error.name;
  reportable.stack = error.stack?.replace(error.message, () => message);
  return reportable;
}

/**
 * Reports an unexpected failure to error tracking. PostHog does not capture
 * console output, so anything worth tracking must go through here. Show the
 * user a plain message separately, never the error text.
 */
export function reportError(
  scope: string,
  error: unknown,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  logDevWarning(scope, error);
  posthog?.captureException(toReportableError(error), { scope, ...properties });
}
