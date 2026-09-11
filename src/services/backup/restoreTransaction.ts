import { Directory, File, Paths } from "expo-file-system";
import type { SQLiteDatabase } from "expo-sqlite";

import { getRestoreRecoveryAction, type RestorePhase } from "./restoreRecovery";

const TRANSACTION_FILE = new File(Paths.document, "restore-transaction.json");
const TRANSACTION_TEMP_FILE = new File(Paths.document, "restore-transaction.next.json");
export const RESTORE_NEXT_MEDIA_DIR = new Directory(Paths.document, "restore-media-next");
export const RESTORE_PREVIOUS_MEDIA_DIR = new Directory(Paths.document, "restore-media-previous");
export const RESTORE_MEDIA_DIR = new Directory(Paths.document, "media");
const RESTORE_MARKER_KEY = "restore_transaction_id";

interface RestoreTransaction {
  id: string;
  phase: RestorePhase;
  hadPreviousMedia: boolean;
}

function removeDirectory(directory: Directory): void {
  if (directory.exists) directory.delete();
}

function readTransaction(): RestoreTransaction | null {
  if (!TRANSACTION_FILE.exists) return null;
  try {
    const parsed = JSON.parse(TRANSACTION_FILE.textSync()) as RestoreTransaction;
    if (
      typeof parsed.id !== "string" ||
      !["prepared", "swapping-media", "media-swapped", "database-committed"].includes(
        parsed.phase
      ) ||
      typeof parsed.hadPreviousMedia !== "boolean"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function persistTransaction(transaction: RestoreTransaction): Promise<void> {
  if (TRANSACTION_TEMP_FILE.exists) TRANSACTION_TEMP_FILE.delete();
  TRANSACTION_TEMP_FILE.write(JSON.stringify(transaction));
  await TRANSACTION_TEMP_FILE.move(TRANSACTION_FILE, { overwrite: true });
}

export async function createRestoreTransaction(): Promise<RestoreTransaction> {
  const transaction: RestoreTransaction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    phase: "prepared",
    hadPreviousMedia: RESTORE_MEDIA_DIR.exists,
  };
  await persistTransaction(transaction);
  return transaction;
}

export async function updateRestoreTransaction(
  transaction: RestoreTransaction,
  phase: RestoreTransaction["phase"]
): Promise<void> {
  transaction.phase = phase;
  await persistTransaction(transaction);
}

export function clearRestoreTransaction(): void {
  if (TRANSACTION_FILE.exists) TRANSACTION_FILE.delete();
  if (TRANSACTION_TEMP_FILE.exists) TRANSACTION_TEMP_FILE.delete();
}

/** Recovers a restore interrupted after the media swap but before the SQLite commit was observed. */
export async function recoverIncompleteRestore(db: SQLiteDatabase): Promise<void> {
  const transaction = readTransaction();
  if (!transaction) return;

  const marker = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    RESTORE_MARKER_KEY
  );
  const databaseCommitted = marker?.value === transaction.id;

  const action = getRestoreRecoveryAction(transaction.phase, databaseCommitted);
  if (action === "complete") {
    removeDirectory(RESTORE_PREVIOUS_MEDIA_DIR);
    removeDirectory(RESTORE_NEXT_MEDIA_DIR);
    clearRestoreTransaction();
    return;
  }

  if (action === "discard-staged-media") {
    removeDirectory(RESTORE_NEXT_MEDIA_DIR);
    clearRestoreTransaction();
    return;
  }

  if (RESTORE_PREVIOUS_MEDIA_DIR.exists) {
    removeDirectory(RESTORE_MEDIA_DIR);
    RESTORE_PREVIOUS_MEDIA_DIR.move(RESTORE_MEDIA_DIR);
  } else if (!RESTORE_MEDIA_DIR.exists) {
    RESTORE_MEDIA_DIR.create({ idempotent: true, intermediates: true });
  }
  removeDirectory(RESTORE_NEXT_MEDIA_DIR);
  clearRestoreTransaction();
}

export const restoreMarkerKey = RESTORE_MARKER_KEY;
