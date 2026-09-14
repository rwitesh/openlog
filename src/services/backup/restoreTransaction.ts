import { Directory, File, Paths } from "expo-file-system";
import { defaultDatabaseDirectory } from "expo-sqlite";

const DATABASE_NAME = "app.db";
const TRANSACTION_FILE = new File(Paths.document, "openlog-restore-transaction.json");

type RestorePhase = "prepared" | "database-swapped" | "media-swapped";

interface RestoreTransaction {
  id: string;
  phase: RestorePhase;
}

function databaseFile(name: string): File {
  if (!defaultDatabaseDirectory) throw new Error("SQLite storage is unavailable.");
  const directoryUri = defaultDatabaseDirectory.startsWith("file://")
    ? defaultDatabaseDirectory
    : `file://${defaultDatabaseDirectory}`;
  return new File(directoryUri, name);
}

function stagedDatabase(transaction: RestoreTransaction): File {
  return new File(Paths.document, `openlog-restore-${transaction.id}.sqlite`);
}

function previousDatabase(transaction: RestoreTransaction): File {
  return databaseFile(`openlog-restore-${transaction.id}-previous.sqlite`);
}

function stagedMedia(transaction: RestoreTransaction): Directory {
  return new Directory(Paths.document, `openlog-restore-${transaction.id}-media`);
}

function previousMedia(transaction: RestoreTransaction): Directory {
  return new Directory(Paths.document, `openlog-restore-${transaction.id}-previous-media`);
}

function activeMedia(): Directory {
  return new Directory(Paths.document, "media");
}

function readTransaction(): RestoreTransaction | null {
  if (!TRANSACTION_FILE.exists) return null;
  try {
    const value = JSON.parse(TRANSACTION_FILE.textSync()) as Partial<RestoreTransaction>;
    if (
      typeof value.id !== "string" ||
      !["prepared", "database-swapped", "media-swapped"].includes(value.phase ?? "")
    ) {
      return null;
    }
    return value as RestoreTransaction;
  } catch {
    return null;
  }
}

async function saveTransaction(transaction: RestoreTransaction): Promise<void> {
  TRANSACTION_FILE.write(JSON.stringify(transaction));
}

async function moveFile(source: File, destination: File): Promise<void> {
  if (source.exists) await source.move(destination, { overwrite: true });
}

async function moveDatabase(sourceName: string, destinationName: string): Promise<void> {
  for (const suffix of ["", "-wal", "-shm"] as const) {
    await moveFile(
      databaseFile(`${sourceName}${suffix}`),
      databaseFile(`${destinationName}${suffix}`)
    );
  }
}

function removeDatabase(name: string): void {
  for (const suffix of ["", "-wal", "-shm"] as const) {
    const file = databaseFile(`${name}${suffix}`);
    if (file.exists) file.delete();
  }
}

function clearTransaction(): void {
  if (TRANSACTION_FILE.exists) TRANSACTION_FILE.delete();
}

export function createRestoreStaging(id: string): { database: File; media: Directory } {
  const transaction: RestoreTransaction = { id, phase: "prepared" };
  return { database: stagedDatabase(transaction), media: stagedMedia(transaction) };
}

export async function queueRestore(id: string): Promise<void> {
  if (TRANSACTION_FILE.exists) {
    throw new Error("A restore is pending. Restart OpenLog before restoring again.");
  }
  const transaction: RestoreTransaction = { id, phase: "prepared" };
  const staging = createRestoreStaging(id);
  if (!staging.database.exists || !staging.media.exists) {
    throw new Error("Restore staging is incomplete.");
  }
  await saveTransaction(transaction);
}

export function discardRestoreStaging(id: string): void {
  const staging = createRestoreStaging(id);
  if (staging.database.exists) staging.database.delete();
  if (staging.media.exists) staging.media.delete();
}

/** Applies a validated, staged file replacement before the app opens SQLite. */
export async function applyPendingRestore(): Promise<void> {
  const transaction = readTransaction();
  if (!transaction) return;

  const nextDatabase = stagedDatabase(transaction);
  const currentDatabase = databaseFile(DATABASE_NAME);
  const previousDb = previousDatabase(transaction);
  if (nextDatabase.exists) {
    await moveDatabase(DATABASE_NAME, previousDb.name);
    await nextDatabase.move(currentDatabase, { overwrite: true });
  }
  if (!currentDatabase.exists) throw new Error("Restore database replacement is incomplete.");
  if (transaction.phase === "prepared") {
    transaction.phase = "database-swapped";
    await saveTransaction(transaction);
  }

  const nextMedia = stagedMedia(transaction);
  const currentMedia = activeMedia();
  const previousMediaDirectory = previousMedia(transaction);
  if (nextMedia.exists) {
    if (currentMedia.exists) await currentMedia.move(previousMediaDirectory, { overwrite: true });
    await nextMedia.move(currentMedia, { overwrite: true });
  }
  if (!currentMedia.exists) throw new Error("Restore media replacement is incomplete.");
  if (transaction.phase === "database-swapped") {
    transaction.phase = "media-swapped";
    await saveTransaction(transaction);
  }
}

/** Discards rollback artifacts only after the replacement database opened successfully. */
export async function completePendingRestore(): Promise<void> {
  const transaction = readTransaction();
  if (transaction?.phase !== "media-swapped") return;

  removeDatabase(previousDatabase(transaction).name);
  const previousMediaDirectory = previousMedia(transaction);
  if (previousMediaDirectory.exists) previousMediaDirectory.delete();
  clearTransaction();
}
