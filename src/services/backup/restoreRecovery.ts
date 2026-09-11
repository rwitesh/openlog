export type RestorePhase = "prepared" | "swapping-media" | "media-swapped" | "database-committed";

export type RestoreRecoveryAction = "complete" | "discard-staged-media" | "rollback-media";

/**
 * Chooses the safe filesystem recovery path after an interrupted restore.
 * A SQLite marker is authoritative because it is written in the same transaction as the import.
 */
export function getRestoreRecoveryAction(
  phase: RestorePhase,
  databaseCommitted: boolean
): RestoreRecoveryAction {
  if (databaseCommitted) return "complete";
  if (phase === "prepared") return "discard-staged-media";
  return "rollback-media";
}
