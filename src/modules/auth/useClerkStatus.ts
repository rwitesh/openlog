import { getClerkInstance } from "@clerk/expo";
import { useEffect, useState } from "react";

type ClerkStatus = "degraded" | "error" | "loading" | "ready";

/** Reactive Clerk initialization status; "error" means the initial load failed. */
export function useClerkStatus(): ClerkStatus {
  const [status, setStatus] = useState<ClerkStatus>(() => getClerkInstance().status ?? "loading");

  useEffect(() => {
    const clerk = getClerkInstance();
    const handler = (next: ClerkStatus) => setStatus(next);
    clerk.on("status", handler, { notify: true });
    return () => clerk.off("status", handler);
  }, []);

  return status;
}

/** Retries Clerk initialization, but only after a failed load. */
export function retryClerkLoad(): void {
  const clerk = getClerkInstance();
  if (clerk.status !== "error") return;
  clerk.load().catch(() => undefined);
}
