import { Directory, File, Paths } from "expo-file-system";

import {
  backupGateGeneration,
  waitForBackupGates,
  waitForImportGate,
} from "@/services/backup/utils";
import { reportError } from "@/shared/utils/devLog";

/** The app's single durable media directory; the database stores bare filenames relative to it. */
export function mediaDirectory(): Directory {
  return new Directory(Paths.document, "media");
}

/** Resolves a stored media filename (e.g. "uuid.jpg") to its live file URI for display and playback. */
export function mediaFileUri(filename: string): string {
  return new File(mediaDirectory(), filename).uri;
}

/** Generates a collision-free filename for durable media storage. */
export function createMediaFilename(ext: string): string {
  const cleanExt = ext.replace(/^\./, "").toLowerCase() || "bin";
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${uuid}.${cleanExt}`;
}

const COPY_ATTEMPTS = 3;

// Copies whose save has not settled. Cleanup skips them until `releaseMediaCopies`: a committed
// row then protects the file, and a failed save's copy is an orphan any cleanup may delete.
const uncommittedCopies = new Set<string>();

/**
 * Copies a picked or recorded file into the durable media directory and returns
 * its stored filename. Cache and picker URIs are ephemeral, so only durable
 * copies may be referenced by an entry. A source already inside the media
 * directory passes through unchanged — re-editing an entry must not duplicate
 * its files.
 */
export async function persistMedia(sourceUri: string, ext: string): Promise<string> {
  await waitForImportGate();
  const dir = mediaDirectory();
  dir.create({ idempotent: true, intermediates: true });

  const dirPrefix = dir.uri.endsWith("/") ? dir.uri : `${dir.uri}/`;
  if (sourceUri.startsWith(dirPrefix)) {
    return sourceUri.slice(dirPrefix.length);
  }

  const filename = createMediaFilename(ext);
  uncommittedCopies.add(filename);
  const target = new File(dir, filename);
  for (let attempt = 1; attempt <= COPY_ATTEMPTS; attempt++) {
    const generation = backupGateGeneration();
    try {
      dir.create({ idempotent: true, intermediates: true });
      await new File(sourceUri).copy(target);
    } catch (error) {
      if (target.exists) target.delete();
      // Only a backup that started meanwhile, such as a restore pruning the copy, earns a retry.
      if (attempt === COPY_ATTEMPTS || generation === backupGateGeneration()) {
        uncommittedCopies.delete(filename);
        throw error;
      }
    }
    // A restore that began during the copy prunes files its timeline does not reference.
    await waitForImportGate();
    if (target.exists) return filename;
  }
  uncommittedCopies.delete(filename);
  throw new Error("The media file could not be saved.");
}

/**
 * Waits out a running restore, then rejects if it pruned a file this session copied for a save.
 * Call it right before the entry's database write: that write is then queued ahead of any
 * later restore's replacement, so the restore either keeps the file or replaces the entry.
 */
export async function assertCopiedMediaPresent(filenames: readonly string[]): Promise<void> {
  await waitForImportGate();
  const dir = mediaDirectory();
  for (const filename of filenames) {
    if (uncommittedCopies.has(filename) && !new File(dir, filename).exists) {
      throw new Error("A restore removed media from this entry. Add it again and save.");
    }
  }
}

/** Call once the save that references these files has committed or failed. */
export function releaseMediaCopies(filenames: readonly string[]): void {
  for (const filename of filenames) uncommittedCopies.delete(filename);
}

function listMediaFiles(): string[] {
  const dir = mediaDirectory();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((item) => item instanceof File)
    .map((item) => item.name);
}

interface DeleteMediaFilesInput {
  /** Picks the filenames to delete; it may run more than once and must read current state. */
  select: () => Promise<readonly string[]>;
}

/**
 * Deletes the stored media files `select` names. `select` runs and the files are deleted
 * while no export reads or import replaces media; if one starts in between, `select` runs again.
 * Missing files are ignored.
 */
export async function deleteMediaFiles({ select }: DeleteMediaFilesInput): Promise<void> {
  for (;;) {
    const generation = await waitForBackupGates();
    const filenames = await select();
    if (generation !== backupGateGeneration()) continue;

    // Synchronous deletes keep a backup from starting between the check above and the last delete.
    const dir = mediaDirectory();
    for (const filename of filenames) {
      try {
        const file = new File(dir, filename);
        if (file.exists) file.delete();
      } catch (error) {
        reportError("media:deleteFiles", error);
      }
    }
    return;
  }
}

/**
 * Deletes stored media that `filterUnreferenced` reports no entry uses, such as files left by an
 * interrupted save or restore. Uncommitted copies are kept: their save may still be running.
 * They are listed before `filterUnreferenced` reads the database, so a copy whose entry commits
 * in between is either still skipped here or already referenced there.
 */
export function deleteUnreferencedMedia(
  filterUnreferenced: (filenames: string[]) => Promise<string[]>
): Promise<void> {
  return deleteMediaFiles({
    select: async () => {
      const candidates = listMediaFiles().filter((filename) => !uncommittedCopies.has(filename));
      return candidates.length > 0 ? filterUnreferenced(candidates) : [];
    },
  });
}
