import type { Directory, File } from "expo-file-system";

export const DATABASE_NAME = "app.db";

export type RestorePhase = "prepared" | "database-swapped" | "media-swapped";

export interface RestoreTransaction {
  id: string;
  phase: RestorePhase;
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
      if (s.exists) await s.copy(d, { overwrite: true });
    },
    moveFile: async (src, dst) => {
      const s = toFile(src);
      const d = toFile(dst);
      if (s.exists) await s.move(d, { overwrite: true });
    },
    directoryExists: async (p) => toDir(p).exists,
    deleteDirectory: async (p) => {
      const d = toDir(p);
      if (d.exists) d.delete();
    },
    moveDirectory: async (src, dst) => {
      const s = toDir(src);
      const d = toDir(dst);
      if (s.exists) await s.move(d, { overwrite: true });
    },
    listFiles: async (dirUri) => {
      const d = toDir(dirUri);
      if (!d.exists) return [];
      return d.list().map((item) => item.name);
    },
  };
}

let customFileSystem: RestoreFileSystem | null = null;

export function setRestoreFileSystem(fs: RestoreFileSystem | null): void {
  customFileSystem = fs;
}

function resolveFileSystem(fs?: RestoreFileSystem): RestoreFileSystem {
  if (fs) return fs;
  if (customFileSystem) return customFileSystem;
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

function getStagedMediaPath(fs: RestoreFileSystem, id: string): string {
  return getDocPath(fs, `openlog-restore-${id}-media`);
}

function getPreviousMediaPath(fs: RestoreFileSystem, id: string): string {
  return getDocPath(fs, `openlog-restore-${id}-previous-media`);
}

function getActiveMediaPath(fs: RestoreFileSystem): string {
  return getDocPath(fs, "media");
}

async function moveDatabaseFiles(
  fs: RestoreFileSystem,
  sourceBaseName: string,
  destBaseName: string
): Promise<void> {
  for (const suffix of ["", "-wal", "-shm"] as const) {
    const src = getDbPath(fs, `${sourceBaseName}${suffix}`);
    const dst = getDbPath(fs, `${destBaseName}${suffix}`);
    if (await fs.exists(src)) {
      await fs.moveFile(src, dst);
    }
  }
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
    if (
      typeof value.id !== "string" ||
      !value.id ||
      !["prepared", "database-swapped", "media-swapped"].includes(value.phase ?? "")
    ) {
      return null;
    }
    const result: RestoreTransaction = {
      id: value.id,
      phase: value.phase as RestorePhase,
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
  // 1. Write to .tmp
  await fs.writeText(fs.journalTmpPath, content);

  // 2. If .json exists, back it up to .bak
  if (await fs.exists(fs.journalPath)) {
    await fs.copyFile(fs.journalPath, fs.journalBakPath);
  }

  // 3. Atomically move .tmp to .json
  await fs.moveFile(fs.journalTmpPath, fs.journalPath);
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
  id: string,
  counts: { entry: number; media: number },
  fsParam?: RestoreFileSystem
): Promise<void>;
export async function queueRestore(
  options: QueueRestoreOptions,
  fsParam?: RestoreFileSystem
): Promise<void>;
export async function queueRestore(
  options: string | QueueRestoreOptions,
  legacyOrFs?:
    | { entry?: number; entryCount?: number; media?: number; mediaCount?: number }
    | number
    | RestoreFileSystem,
  fsArg?: RestoreFileSystem
): Promise<void> {
  let fs: RestoreFileSystem;
  let entryCount: number | undefined;
  let mediaCount: number | undefined;
  let id: string;

  if (typeof options === "string") {
    id = options;
    if (typeof legacyOrFs === "number") {
      entryCount = legacyOrFs;
      fs = resolveFileSystem(fsArg);
    } else if (legacyOrFs && typeof legacyOrFs === "object") {
      if ("journalPath" in legacyOrFs) {
        fs = legacyOrFs as RestoreFileSystem;
      } else {
        const counts = legacyOrFs as {
          entry?: number;
          entryCount?: number;
          media?: number;
          mediaCount?: number;
        };
        entryCount = counts.entry ?? counts.entryCount;
        mediaCount = counts.media ?? counts.mediaCount;
        fs = resolveFileSystem(fsArg);
      }
    } else {
      fs = resolveFileSystem(fsArg);
    }
  } else {
    id = options.id;
    entryCount = options.entryCount;
    mediaCount = options.mediaCount;
    fs = resolveFileSystem(legacyOrFs as RestoreFileSystem | undefined);
  }

  const existing = await readDurableTransaction(fs);
  if (existing.transaction || existing.corrupt) {
    throw new Error("A restore is pending. Restart OpenLog before restoring again.");
  }

  const transaction: RestoreTransaction = {
    id,
    phase: "prepared",
    entryCount: entryCount ?? 0,
    mediaCount: mediaCount ?? 0,
    timestamp: Date.now(),
  };
  const stagedDb = getStagedDbPath(fs, id);
  const stagedMedia = getStagedMediaPath(fs, id);

  if (!(await fs.exists(stagedDb)) || !(await fs.directoryExists(stagedMedia))) {
    throw new Error("Restore staging is incomplete.");
  }

  await saveDurableTransaction(transaction, fs);
}

export async function rollbackPendingRestore(
  fsOrCustom?: RestoreFileSystem,
  target?: { id?: string }
): Promise<void> {
  const fs = resolveFileSystem(fsOrCustom);
  const targetId = target?.id;

  let prevDbBase = targetId ? getPreviousDbBase(targetId) : undefined;
  let prevMediaPath = targetId ? getPreviousMediaPath(fs, targetId) : undefined;

  if (!prevDbBase || !prevMediaPath) {
    const diskArtifacts = await findPreviousArtifactsOnDisk(fs);
    if (!prevDbBase && diskArtifacts.previousDbBase) {
      prevDbBase = diskArtifacts.previousDbBase;
    }
    if (!prevMediaPath && diskArtifacts.previousMediaPath) {
      prevMediaPath = diskArtifacts.previousMediaPath;
    }
  }

  // 1. Move previousDatabase back to live DATABASE_NAME
  if (prevDbBase) {
    const prevDbFile = getDbPath(fs, prevDbBase);
    if (await fs.exists(prevDbFile)) {
      await moveDatabaseFiles(fs, prevDbBase, DATABASE_NAME);
    }
  }

  // 2. Move previousMedia back to live media directory
  if (prevMediaPath && (await fs.directoryExists(prevMediaPath))) {
    const activeMedia = getActiveMediaPath(fs);
    if (await fs.directoryExists(activeMedia)) {
      await fs.deleteDirectory(activeMedia);
    }
    await fs.moveDirectory(prevMediaPath, activeMedia);
  }

  // 3. Remove staging
  if (targetId) {
    const stagedDb = getStagedDbPath(fs, targetId);
    if (await fs.exists(stagedDb)) await fs.deleteFile(stagedDb);
    const stagedMedia = getStagedMediaPath(fs, targetId);
    if (await fs.directoryExists(stagedMedia)) await fs.deleteDirectory(stagedMedia);
  }

  // Clean up any remaining restore artifacts on disk
  try {
    const docFiles = await fs.listFiles(fs.documentDirectory);
    for (const item of docFiles) {
      if (item.startsWith("openlog-restore-")) {
        const itemPath = getDocPath(fs, item);
        if (await fs.directoryExists(itemPath)) {
          await fs.deleteDirectory(itemPath);
        } else if (await fs.exists(itemPath)) {
          await fs.deleteFile(itemPath);
        }
      }
    }
  } catch {
    // ignore
  }

  // 4. Remove all journal files
  await clearAllJournalFiles(fs);
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

  const { id } = transaction;

  if (transaction.phase === "prepared") {
    const stagedDb = getStagedDbPath(fs, id);
    if (!(await fs.exists(stagedDb))) {
      await rollbackPendingRestore(fs, transaction);
      return { applied: false };
    }

    // Step 1: swap database
    const prevDbBase = getPreviousDbBase(id);
    await moveDatabaseFiles(fs, DATABASE_NAME, prevDbBase);
    const liveDb = getDbPath(fs, DATABASE_NAME);
    await fs.moveFile(stagedDb, liveDb);

    transaction.phase = "database-swapped";
    await saveDurableTransaction(transaction, fs);

    // Step 2: swap media
    const stagedMedia = getStagedMediaPath(fs, id);
    if (!(await fs.directoryExists(stagedMedia))) {
      await rollbackPendingRestore(fs, transaction);
      return { applied: false };
    }

    const activeMedia = getActiveMediaPath(fs);
    const prevMedia = getPreviousMediaPath(fs, id);
    if (await fs.directoryExists(activeMedia)) {
      await fs.moveDirectory(activeMedia, prevMedia);
    }
    await fs.moveDirectory(stagedMedia, activeMedia);

    transaction.phase = "media-swapped";
    await saveDurableTransaction(transaction, fs);
    return { applied: true, id: transaction.id, entryCount: transaction.entryCount };
  }

  if (transaction.phase === "database-swapped") {
    const stagedMedia = getStagedMediaPath(fs, id);
    if (!(await fs.directoryExists(stagedMedia))) {
      // Staged media missing; roll back to ensure consistency
      await rollbackPendingRestore(fs, transaction);
      return { applied: false };
    }

    const activeMedia = getActiveMediaPath(fs);
    const prevMedia = getPreviousMediaPath(fs, id);
    if (await fs.directoryExists(activeMedia)) {
      await fs.moveDirectory(activeMedia, prevMedia);
    }
    await fs.moveDirectory(stagedMedia, activeMedia);

    transaction.phase = "media-swapped";
    await saveDurableTransaction(transaction, fs);
    return { applied: true, id: transaction.id, entryCount: transaction.entryCount };
  }

  if (transaction.phase === "media-swapped") {
    return { applied: true, id: transaction.id, entryCount: transaction.entryCount };
  }

  return { applied: false };
}

interface DatabaseCountReader {
  getFirstAsync<T>(source: string): Promise<T | null>;
}

let defaultNotifyImportComplete: ((entryCount: number) => void) | null = null;
let defaultAnalyticsCapture: ((entryCount: number) => void) | null = null;

export function configureRestoreCompletion(hooks: {
  notify?: (entryCount: number) => void;
  analytics?: (entryCount: number) => void;
}): void {
  if (hooks.notify) defaultNotifyImportComplete = hooks.notify;
  if (hooks.analytics) defaultAnalyticsCapture = hooks.analytics;
}

export async function completePendingRestore(
  db?: unknown,
  options?: CompleteRestoreOptions
): Promise<CompletedRestoreDetails | null> {
  const fs = resolveFileSystem(options?.fs);
  const { transaction } = await readDurableTransaction(fs);
  if (transaction?.phase !== "media-swapped") {
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
  const notifyFn = options?.notify ?? defaultNotifyImportComplete;
  if (notifyFn) {
    try {
      notifyFn(finalCount);
    } catch {
      // ignore
    }
  }

  const analyticsFn = options?.analytics ?? defaultAnalyticsCapture;
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

export function createMemoryRestoreFileSystem(
  initialFiles: Record<string, string> = {}
): RestoreFileSystem & { files: Map<string, string>; dirs: Set<string> } {
  const files = new Map<string, string>(Object.entries(initialFiles));
  const dirs = new Set<string>(["/mock/doc", "/mock/db", "/mock/doc/media"]);

  const docDir = "/mock/doc";
  const dbDir = "/mock/db";

  return {
    files,
    dirs,
    documentDirectory: docDir,
    databaseDirectory: dbDir,
    journalPath: `${docDir}/openlog-restore-transaction.json`,
    journalBakPath: `${docDir}/openlog-restore-transaction.bak`,
    journalTmpPath: `${docDir}/openlog-restore-transaction.tmp`,

    exists: async (p) => files.has(p) || dirs.has(p),
    readText: async (p) => {
      const content = files.get(p);
      if (content === undefined) throw new Error(`File not found: ${p}`);
      return content;
    },
    writeText: async (p, content) => {
      files.set(p, content);
    },
    deleteFile: async (p) => {
      files.delete(p);
    },
    copyFile: async (src, dst) => {
      const content = files.get(src);
      if (content !== undefined) files.set(dst, content);
    },
    moveFile: async (src, dst) => {
      const content = files.get(src);
      if (content !== undefined) {
        files.set(dst, content);
        files.delete(src);
      }
    },
    directoryExists: async (p) => dirs.has(p),
    deleteDirectory: async (p) => {
      dirs.delete(p);
      const prefix = p.endsWith("/") ? p : `${p}/`;
      for (const k of Array.from(files.keys())) {
        if (k.startsWith(prefix) || k === p) files.delete(k);
      }
      for (const d of Array.from(dirs)) {
        if (d.startsWith(prefix) || d === p) dirs.delete(d);
      }
    },
    moveDirectory: async (src, dst) => {
      dirs.delete(src);
      dirs.add(dst);
      const srcPrefix = src.endsWith("/") ? src : `${src}/`;
      const dstPrefix = dst.endsWith("/") ? dst : `${dst}/`;
      for (const [k, v] of Array.from(files.entries())) {
        if (k.startsWith(srcPrefix)) {
          files.set(dstPrefix + k.slice(srcPrefix.length), v);
          files.delete(k);
        }
      }
      for (const d of Array.from(dirs)) {
        if (d.startsWith(srcPrefix)) {
          dirs.add(dstPrefix + d.slice(srcPrefix.length));
          dirs.delete(d);
        }
      }
    },
    listFiles: async (dir) => {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      const results = new Set<string>();
      for (const f of files.keys()) {
        if (f.startsWith(prefix)) {
          const rest = f.slice(prefix.length);
          const seg = rest.split("/")[0];
          if (seg) results.add(seg);
        }
      }
      for (const d of dirs) {
        if (d.startsWith(prefix)) {
          const rest = d.slice(prefix.length);
          const seg = rest.split("/")[0];
          if (seg) results.add(seg);
        }
      }
      return Array.from(results);
    },
  };
}
