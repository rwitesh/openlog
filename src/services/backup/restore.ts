import type { Directory, File } from "expo-file-system";

export const DATABASE_NAME = "app.db";

const RESTORE_OPERATIONS = [
  "preserve-db-main",
  "preserve-db-wal",
  "preserve-db-shm",
  "activate-db",
  "preserve-media",
  "activate-media",
  "ready-for-verification",
  "rollback-discard-db-main",
  "rollback-discard-db-wal",
  "rollback-discard-db-shm",
  "rollback-restore-db-main",
  "rollback-restore-db-wal",
  "rollback-restore-db-shm",
  "rollback-discard-media",
  "rollback-restore-media",
  "rollback-cleanup",
] as const;

type RestoreOperation = (typeof RESTORE_OPERATIONS)[number];

function isRestoreOperation(value: unknown): value is RestoreOperation {
  return typeof value === "string" && RESTORE_OPERATIONS.includes(value as RestoreOperation);
}

function isRollbackOperation(operation: RestoreOperation): boolean {
  return operation.startsWith("rollback-");
}

export interface RestoreTransaction {
  id: string;
  operation: RestoreOperation;
  originalDatabaseExists?: boolean;
  originalMediaExists?: boolean;
  entryCount?: number;
  mediaCount?: number;
  timestamp?: number;
}

export interface CompletedRestoreDetails {
  entryCount: number;
  mediaCount: number;
}

export interface QueueRestoreOptions {
  id: string;
  entryCount?: number;
  mediaCount?: number;
}

export interface ApplyRestoreResult {
  applied: boolean;
  id?: string;
  entryCount?: number;
}

export interface CompleteRestoreOptions {
  notify?: (entryCount: number) => void;
  analytics?: (entryCount: number) => void;
  fs?: RestoreFileSystem;
}

export interface RestoreFileSystem {
  documentDirectory: string;
  databaseDirectory: string;
  journalPath: string;
  journalBakPath: string;
  journalTmpPath: string;

  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  moveFile(source: string, destination: string): Promise<void>;

  directoryExists(path: string): Promise<boolean>;
  deleteDirectory(path: string): Promise<void>;
  moveDirectory(source: string, destination: string): Promise<void>;

  listFiles(directory: string): Promise<string[]>;
}

interface ExpoFileSystemModule {
  File: new (...uris: unknown[]) => File;
  Directory: new (...uris: unknown[]) => Directory;
  Paths: {
    document: { uri: string } | string;
  };
}

interface ExpoSqliteModule {
  defaultDatabaseDirectory: string | null;
}

function getExpoFileSystem(): ExpoFileSystemModule {
  if (typeof require === "function") {
    return (require as (id: string) => unknown)("expo-file-system") as ExpoFileSystemModule;
  }
  throw new Error("expo-file-system is unavailable in this environment.");
}

function getExpoSqlite(): ExpoSqliteModule {
  if (typeof require === "function") {
    return (require as (id: string) => unknown)("expo-sqlite") as ExpoSqliteModule;
  }
  throw new Error("expo-sqlite is unavailable in this environment.");
}

function createExpoFileSystem(): RestoreFileSystem {
  const { File, Directory, Paths } = getExpoFileSystem();
  const { defaultDatabaseDirectory } = getExpoSqlite();

  if (!defaultDatabaseDirectory) throw new Error("SQLite storage is unavailable.");
  const dbDirUri = defaultDatabaseDirectory.startsWith("file://")
    ? defaultDatabaseDirectory
    : `file://${defaultDatabaseDirectory}`;
  const docDirUri = typeof Paths.document === "string" ? Paths.document : Paths.document.uri;

  const toFile = (path: string) => new File(path);
  const toDir = (path: string) => new Directory(path);

  const journalFile = new File(docDirUri, "openlog-restore-transaction.json");
  const journalBakFile = new File(docDirUri, "openlog-restore-transaction.bak");
  const journalTmpFile = new File(docDirUri, "openlog-restore-transaction.tmp");

  return {
    documentDirectory: docDirUri,
    databaseDirectory: dbDirUri,
    journalPath: journalFile.uri,
    journalBakPath: journalBakFile.uri,
    journalTmpPath: journalTmpFile.uri,

    exists: async (p) => toFile(p).exists,
    readText: async (p) => toFile(p).textSync(),
    writeText: async (p, content) => {
      const f = toFile(p);
      if (!f.exists) f.create({ overwrite: true });
      f.write(content);
    },
    deleteFile: async (p) => {
      const f = toFile(p);
      if (f.exists) f.delete();
    },
    copyFile: async (src, dst) => {
      const s = toFile(src);
      const d = toFile(dst);
      if (s.exists) {
        if (d.exists) d.delete();
        await s.copy(d, { overwrite: true });
      }
    },
    moveFile: async (src, dst) => {
      const s = toFile(src);
      const d = toFile(dst);
      if (s.exists) {
        if (d.exists) d.delete();
        await s.move(d, { overwrite: true });
      }
    },
    directoryExists: async (p) => toDir(p).exists,
    deleteDirectory: async (p) => {
      const d = toDir(p);
      if (d.exists) d.delete();
    },
    moveDirectory: async (src, dst) => {
      const s = toDir(src);
      const d = toDir(dst);
      if (s.exists) {
        if (d.exists) d.delete();
        await s.move(d, { overwrite: true });
      }
    },
    listFiles: async (dirUri) => {
      const d = toDir(dirUri);
      if (!d.exists) return [];
      return d.list().map((item) => item.name);
    },
  };
}

function resolveFileSystem(fs?: RestoreFileSystem): RestoreFileSystem {
  if (fs) return fs;
  return createExpoFileSystem();
}

function getDbPath(fs: RestoreFileSystem, filename: string): string {
  const base = fs.databaseDirectory.replace(/\/+$/, "");
  return `${base}/${filename}`;
}

function getDocPath(fs: RestoreFileSystem, filename: string): string {
  const base = fs.documentDirectory.replace(/\/+$/, "");
  return `${base}/${filename}`;
}

function getStagedDbPath(fs: RestoreFileSystem, id: string): string {
  return getDocPath(fs, `openlog-restore-${id}.sqlite`);
}

function getPreviousDbBase(id: string): string {
  return `openlog-restore-${id}-previous.sqlite`;
}

function getDiscardedDbBase(id: string): string {
  return `openlog-restore-${id}-discarded.sqlite`;
}

function getStagedMediaPath(fs: RestoreFileSystem, id: string): string {
  return getDocPath(fs, `openlog-restore-${id}-media`);
}

function getPreviousMediaPath(fs: RestoreFileSystem, id: string): string {
  return getDocPath(fs, `openlog-restore-${id}-previous-media`);
}

function getDiscardedMediaPath(fs: RestoreFileSystem, id: string): string {
  return getDocPath(fs, `openlog-restore-${id}-discarded-media`);
}

function getActiveMediaPath(fs: RestoreFileSystem): string {
  return getDocPath(fs, "media");
}

async function removeDatabaseFiles(fs: RestoreFileSystem, baseName: string): Promise<void> {
  for (const suffix of ["", "-wal", "-shm"] as const) {
    const file = getDbPath(fs, `${baseName}${suffix}`);
    if (await fs.exists(file)) {
      await fs.deleteFile(file);
    }
  }
}

function parseTransactionJson(raw: string): RestoreTransaction | null {
  try {
    const value = JSON.parse(raw) as Partial<RestoreTransaction>;
    if (typeof value.id !== "string" || !value.id || !isRestoreOperation(value.operation)) {
      return null;
    }
    const result: RestoreTransaction = {
      id: value.id,
      operation: value.operation,
      ...(typeof value.originalDatabaseExists === "boolean"
        ? { originalDatabaseExists: value.originalDatabaseExists }
        : {}),
      ...(typeof value.originalMediaExists === "boolean"
        ? { originalMediaExists: value.originalMediaExists }
        : {}),
      entryCount:
        typeof value.entryCount === "number" && value.entryCount >= 0 ? value.entryCount : 0,
      mediaCount:
        typeof value.mediaCount === "number" && value.mediaCount >= 0 ? value.mediaCount : 0,
      timestamp:
        typeof value.timestamp === "number" && Number.isFinite(value.timestamp)
          ? value.timestamp
          : Date.now(),
    };
    return result;
  } catch {
    return null;
  }
}

export interface ReadTransactionResult {
  transaction: RestoreTransaction | null;
  corrupt: boolean;
  recovered: boolean;
}

export async function readDurableTransaction(
  fs: RestoreFileSystem
): Promise<ReadTransactionResult> {
  const jsonExists = await fs.exists(fs.journalPath);
  const bakExists = await fs.exists(fs.journalBakPath);
  const tmpExists = await fs.exists(fs.journalTmpPath);

  if (!jsonExists && !bakExists && !tmpExists) {
    return { transaction: null, corrupt: false, recovered: false };
  }

  // 1. Try reading primary .json
  if (jsonExists) {
    try {
      const text = await fs.readText(fs.journalPath);
      const parsed = parseTransactionJson(text);
      if (parsed) {
        return { transaction: parsed, corrupt: false, recovered: false };
      }
    } catch {
      // primary .json is corrupt
    }
  }

  // 2. Primary missing or corrupt: inspect .bak
  if (bakExists) {
    try {
      const text = await fs.readText(fs.journalBakPath);
      const parsed = parseTransactionJson(text);
      if (parsed) {
        // Recovered from .bak; resave to restore primary .json
        await saveDurableTransaction(parsed, fs);
        return { transaction: parsed, corrupt: false, recovered: true };
      }
    } catch {
      // .bak is corrupt
    }
  }

  // 3. Inspect .tmp
  if (tmpExists) {
    try {
      const text = await fs.readText(fs.journalTmpPath);
      const parsed = parseTransactionJson(text);
      if (parsed) {
        // Recovered from .tmp
        await saveDurableTransaction(parsed, fs);
        return { transaction: parsed, corrupt: false, recovered: true };
      }
    } catch {
      // .tmp is corrupt
    }
  }

  // Files existed, but none were parseable
  return { transaction: null, corrupt: true, recovered: false };
}

export async function saveDurableTransaction(
  transaction: RestoreTransaction,
  fs: RestoreFileSystem
): Promise<void> {
  const content = JSON.stringify(transaction);
  // 1. If .json exists, back it up to .bak first to preserve the last-known-valid record
  if (await fs.exists(fs.journalPath)) {
    try {
      const current = await fs.readText(fs.journalPath);
      await fs.writeText(fs.journalBakPath, current);
    } catch {
      // ignore
    }
  }

  // 2. Write directly to .json using file write rather than move,
  // avoiding Android NoSuchFileException on in-place file replacement.
  await fs.writeText(fs.journalPath, content);

  // 3. Remove .tmp if it lingered
  if (await fs.exists(fs.journalTmpPath)) {
    await fs.deleteFile(fs.journalTmpPath);
  }
}

async function clearAllJournalFiles(fs: RestoreFileSystem): Promise<void> {
  if (await fs.exists(fs.journalPath)) await fs.deleteFile(fs.journalPath);
  if (await fs.exists(fs.journalBakPath)) await fs.deleteFile(fs.journalBakPath);
  if (await fs.exists(fs.journalTmpPath)) await fs.deleteFile(fs.journalTmpPath);
}

async function findPreviousArtifactsOnDisk(fs: RestoreFileSystem): Promise<{
  previousDbBase?: string;
  previousMediaPath?: string;
}> {
  let previousDbBase: string | undefined;
  let previousMediaPath: string | undefined;

  try {
    const dbFiles = await fs.listFiles(fs.databaseDirectory);
    for (const file of dbFiles) {
      const match = file.match(/^(openlog-restore-.+-previous\.sqlite)$/);
      if (match) {
        previousDbBase = match[1];
        break;
      }
    }
  } catch {
    // ignore
  }

  try {
    const docFiles = await fs.listFiles(fs.documentDirectory);
    for (const dirName of docFiles) {
      if (dirName.match(/^openlog-restore-.+-previous-media$/)) {
        previousMediaPath = getDocPath(fs, dirName);
        break;
      }
    }
  } catch {
    // ignore
  }

  return { previousDbBase, previousMediaPath };
}

export function createRestoreStaging(id: string): { database: File; media: Directory } {
  const { File, Directory, Paths } = getExpoFileSystem();
  const docDir = typeof Paths.document === "string" ? Paths.document : Paths.document.uri;
  return {
    database: new File(docDir, `openlog-restore-${id}.sqlite`),
    media: new Directory(docDir, `openlog-restore-${id}-media`),
  };
}

export function discardRestoreStaging(id: string, fsOrCustom?: RestoreFileSystem): void {
  try {
    const fs = resolveFileSystem(fsOrCustom);
    const stagedDb = getStagedDbPath(fs, id);
    const stagedMedia = getStagedMediaPath(fs, id);
    void (async () => {
      try {
        if (await fs.exists(stagedDb)) await fs.deleteFile(stagedDb);
        if (await fs.directoryExists(stagedMedia)) await fs.deleteDirectory(stagedMedia);
      } catch {
        // ignore
      }
    })();
  } catch {
    // ignore
  }
}

export async function queueRestore(
  options: QueueRestoreOptions,
  fsParam?: RestoreFileSystem
): Promise<void> {
  const fs = resolveFileSystem(fsParam);
  const { id, entryCount = 0, mediaCount = 0 } = options;

  const existing = await readDurableTransaction(fs);
  if (existing.transaction || existing.corrupt) {
    throw new Error("A restore is pending. Restart OpenLog before restoring again.");
  }

  const transaction: RestoreTransaction = {
    id,
    operation: "preserve-db-main",
    originalDatabaseExists: await fs.exists(getDbPath(fs, DATABASE_NAME)),
    originalMediaExists: await fs.directoryExists(getActiveMediaPath(fs)),
    entryCount,
    mediaCount,
    timestamp: Date.now(),
  };
  const stagedDb = getStagedDbPath(fs, id);
  const stagedMedia = getStagedMediaPath(fs, id);

  if (!(await fs.exists(stagedDb)) || !(await fs.directoryExists(stagedMedia))) {
    throw new Error("Restore staging is incomplete.");
  }

  await saveDurableTransaction(transaction, fs);
}

export async function rollbackPendingRestore(fsOrCustom?: RestoreFileSystem): Promise<void> {
  const fs = resolveFileSystem(fsOrCustom);
  const durable = (await readDurableTransaction(fs)).transaction;
  let transaction: RestoreTransaction | null = durable;
  if (!transaction) {
    const artifacts = await findPreviousArtifactsOnDisk(fs);
    const id = artifacts.previousDbBase?.match(/^openlog-restore-(.+)-previous\.sqlite$/)?.[1];
    if (id) {
      transaction = {
        id,
        operation: "rollback-discard-db-main",
        originalDatabaseExists: true,
        originalMediaExists: Boolean(artifacts.previousMediaPath),
      };
    }
  }
  if (!transaction) return;
  if (!isRollbackOperation(transaction.operation)) {
    transaction.operation = "rollback-discard-db-main";
  }
  await saveDurableTransaction(transaction, fs);
  await resumeRollback(transaction, fs);
}

export async function applyPendingRestore(
  fsOrCustom?: RestoreFileSystem
): Promise<ApplyRestoreResult> {
  const fs = resolveFileSystem(fsOrCustom);
  const { transaction, corrupt } = await readDurableTransaction(fs);

  // If journal is corrupt: inspect disk for previous files and roll back safely
  if (corrupt) {
    const diskArtifacts = await findPreviousArtifactsOnDisk(fs);
    if (diskArtifacts.previousDbBase || diskArtifacts.previousMediaPath) {
      await rollbackPendingRestore(fs);
    } else {
      await clearAllJournalFiles(fs);
    }
    return { applied: false };
  }

  if (!transaction) {
    // Inspect disk for unjournaled rollback artifacts
    const diskArtifacts = await findPreviousArtifactsOnDisk(fs);
    if (diskArtifacts.previousDbBase || diskArtifacts.previousMediaPath) {
      await rollbackPendingRestore(fs);
    }
    return { applied: false };
  }

  try {
    if (isRollbackOperation(transaction.operation)) {
      await resumeRollback(transaction, fs);
      return { applied: false };
    }
    await resumeRestore(transaction, fs);
    return { applied: true, id: transaction.id, entryCount: transaction.entryCount };
  } catch {
    // Missing staging cannot be retried. Reconstruct the preserved original instead.
    // Other ambiguous states retain their journal and artifacts for a later safe retry.
    const databaseCannotBeActivated =
      !(await fs.exists(getStagedDbPath(fs, transaction.id))) &&
      !(await fs.exists(getDbPath(fs, DATABASE_NAME)));
    const mediaCannotBeActivated =
      !(await fs.directoryExists(getStagedMediaPath(fs, transaction.id))) &&
      !(await fs.directoryExists(getActiveMediaPath(fs)));
    if (databaseCannotBeActivated || mediaCannotBeActivated) {
      await rollbackPendingRestore(fs);
    }
    return { applied: false };
  }
}

async function advanceOperation(
  transaction: RestoreTransaction,
  operation: RestoreOperation,
  fs: RestoreFileSystem
): Promise<void> {
  transaction.operation = operation;
  await saveDurableTransaction(transaction, fs);
}

async function reconcileFileMove(
  fs: RestoreFileSystem,
  source: string,
  destination: string,
  required: boolean
): Promise<void> {
  const sourceExists = await fs.exists(source);
  const destinationExists = await fs.exists(destination);
  if (sourceExists && !destinationExists) {
    await fs.moveFile(source, destination);
    return;
  }
  if (!sourceExists && destinationExists) return;
  if (!sourceExists && !destinationExists && !required) return;
  throw new Error("Restore filesystem state is ambiguous; preserved data was not changed.");
}

async function reconcileDirectoryMove(
  fs: RestoreFileSystem,
  source: string,
  destination: string,
  required: boolean
): Promise<void> {
  const sourceExists = await fs.directoryExists(source);
  const destinationExists = await fs.directoryExists(destination);
  if (sourceExists && !destinationExists) {
    await fs.moveDirectory(source, destination);
    return;
  }
  if (!sourceExists && destinationExists) return;
  if (!sourceExists && !destinationExists && !required) return;
  throw new Error("Restore filesystem state is ambiguous; preserved data was not changed.");
}

async function resumeRestore(
  transaction: RestoreTransaction,
  fs: RestoreFileSystem
): Promise<void> {
  const { id } = transaction;
  while (transaction.operation !== "ready-for-verification") {
    switch (transaction.operation) {
      case "preserve-db-main":
        await reconcileFileMove(
          fs,
          getDbPath(fs, DATABASE_NAME),
          getDbPath(fs, getPreviousDbBase(id)),
          transaction.originalDatabaseExists === true
        );
        await advanceOperation(transaction, "preserve-db-wal", fs);
        break;
      case "preserve-db-wal":
        await reconcileFileMove(
          fs,
          getDbPath(fs, `${DATABASE_NAME}-wal`),
          getDbPath(fs, `${getPreviousDbBase(id)}-wal`),
          false
        );
        await advanceOperation(transaction, "preserve-db-shm", fs);
        break;
      case "preserve-db-shm":
        await reconcileFileMove(
          fs,
          getDbPath(fs, `${DATABASE_NAME}-shm`),
          getDbPath(fs, `${getPreviousDbBase(id)}-shm`),
          false
        );
        await advanceOperation(transaction, "activate-db", fs);
        break;
      case "activate-db":
        await reconcileFileMove(fs, getStagedDbPath(fs, id), getDbPath(fs, DATABASE_NAME), true);
        await advanceOperation(transaction, "preserve-media", fs);
        break;
      case "preserve-media":
        await reconcileDirectoryMove(
          fs,
          getActiveMediaPath(fs),
          getPreviousMediaPath(fs, id),
          transaction.originalMediaExists === true
        );
        await advanceOperation(transaction, "activate-media", fs);
        break;
      case "activate-media":
        await reconcileDirectoryMove(fs, getStagedMediaPath(fs, id), getActiveMediaPath(fs), true);
        await advanceOperation(transaction, "ready-for-verification", fs);
        break;
    }
  }
}

async function resumeRollback(
  transaction: RestoreTransaction,
  fs: RestoreFileSystem
): Promise<void> {
  const { id } = transaction;
  const previous = getPreviousDbBase(id);
  const discarded = getDiscardedDbBase(id);
  while (transaction.operation !== "rollback-cleanup") {
    switch (transaction.operation) {
      case "rollback-discard-db-main":
        await reconcileFileMove(fs, getDbPath(fs, DATABASE_NAME), getDbPath(fs, discarded), false);
        await advanceOperation(transaction, "rollback-discard-db-wal", fs);
        break;
      case "rollback-discard-db-wal":
        await reconcileFileMove(
          fs,
          getDbPath(fs, `${DATABASE_NAME}-wal`),
          getDbPath(fs, `${discarded}-wal`),
          false
        );
        await advanceOperation(transaction, "rollback-discard-db-shm", fs);
        break;
      case "rollback-discard-db-shm":
        await reconcileFileMove(
          fs,
          getDbPath(fs, `${DATABASE_NAME}-shm`),
          getDbPath(fs, `${discarded}-shm`),
          false
        );
        await advanceOperation(transaction, "rollback-restore-db-main", fs);
        break;
      case "rollback-restore-db-main":
        await reconcileFileMove(
          fs,
          getDbPath(fs, previous),
          getDbPath(fs, DATABASE_NAME),
          transaction.originalDatabaseExists !== false
        );
        await advanceOperation(transaction, "rollback-restore-db-wal", fs);
        break;
      case "rollback-restore-db-wal":
        await reconcileFileMove(
          fs,
          getDbPath(fs, `${previous}-wal`),
          getDbPath(fs, `${DATABASE_NAME}-wal`),
          false
        );
        await advanceOperation(transaction, "rollback-restore-db-shm", fs);
        break;
      case "rollback-restore-db-shm":
        await reconcileFileMove(
          fs,
          getDbPath(fs, `${previous}-shm`),
          getDbPath(fs, `${DATABASE_NAME}-shm`),
          false
        );
        await advanceOperation(transaction, "rollback-discard-media", fs);
        break;
      case "rollback-discard-media":
        await reconcileDirectoryMove(
          fs,
          getActiveMediaPath(fs),
          getDiscardedMediaPath(fs, id),
          false
        );
        await advanceOperation(transaction, "rollback-restore-media", fs);
        break;
      case "rollback-restore-media":
        await reconcileDirectoryMove(
          fs,
          getPreviousMediaPath(fs, id),
          getActiveMediaPath(fs),
          transaction.originalMediaExists === true
        );
        await advanceOperation(transaction, "rollback-cleanup", fs);
        break;
    }
  }
  await removeDatabaseFiles(fs, discarded);
  const discardedMedia = getDiscardedMediaPath(fs, id);
  if (await fs.directoryExists(discardedMedia)) await fs.deleteDirectory(discardedMedia);
  if (await fs.exists(getStagedDbPath(fs, id))) await fs.deleteFile(getStagedDbPath(fs, id));
  if (await fs.directoryExists(getStagedMediaPath(fs, id))) {
    await fs.deleteDirectory(getStagedMediaPath(fs, id));
  }
  await clearAllJournalFiles(fs);
}

interface DatabaseCountReader {
  getFirstAsync<T>(source: string): Promise<T | null>;
}

export async function completePendingRestore(
  db?: unknown,
  options?: CompleteRestoreOptions
): Promise<CompletedRestoreDetails | null> {
  const fs = resolveFileSystem(options?.fs);
  const { transaction } = await readDurableTransaction(fs);
  if (transaction?.operation !== "ready-for-verification") {
    return null;
  }

  let entryCount: number | undefined = transaction.entryCount;
  if (
    typeof entryCount !== "number" &&
    db !== null &&
    typeof db === "object" &&
    "getFirstAsync" in db &&
    typeof (db as DatabaseCountReader).getFirstAsync === "function"
  ) {
    try {
      const row = await (db as DatabaseCountReader).getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM entries"
      );
      if (typeof row?.count === "number") {
        entryCount = row.count;
      }
    } catch {
      // ignore
    }
  }

  const finalCount = entryCount ?? 0;

  // Clean up rollback artifacts
  if (transaction.id) {
    await removeDatabaseFiles(fs, getPreviousDbBase(transaction.id));
    const prevMedia = getPreviousMediaPath(fs, transaction.id);
    if (await fs.directoryExists(prevMedia)) {
      await fs.deleteDirectory(prevMedia);
    }
    const stagedDb = getStagedDbPath(fs, transaction.id);
    if (await fs.exists(stagedDb)) await fs.deleteFile(stagedDb);
    const stagedMedia = getStagedMediaPath(fs, transaction.id);
    if (await fs.directoryExists(stagedMedia)) await fs.deleteDirectory(stagedMedia);
  }

  // Scan and clean up any remaining orphan previous or staging files
  try {
    const dbFiles = await fs.listFiles(fs.databaseDirectory);
    for (const f of dbFiles) {
      if (f.startsWith("openlog-restore-")) {
        await fs.deleteFile(getDbPath(fs, f));
      }
    }
  } catch {
    // ignore
  }

  try {
    const docFiles = await fs.listFiles(fs.documentDirectory);
    for (const d of docFiles) {
      if (d.startsWith("openlog-restore-")) {
        const p = getDocPath(fs, d);
        if (await fs.directoryExists(p)) await fs.deleteDirectory(p);
        else if (await fs.exists(p)) await fs.deleteFile(p);
      }
    }
  } catch {
    // ignore
  }

  // Remove journal
  await clearAllJournalFiles(fs);

  // Fire notifications and analytics
  const notifyFn = options?.notify;
  if (notifyFn) {
    try {
      notifyFn(finalCount);
    } catch {
      // ignore
    }
  }

  const analyticsFn = options?.analytics;
  if (analyticsFn) {
    try {
      analyticsFn(finalCount);
    } catch {
      // ignore
    }
  }

  return {
    entryCount: finalCount,
    mediaCount: transaction.mediaCount ?? 0,
  };
}
