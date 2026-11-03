import { Directory, File, Paths } from "expo-file-system";

import { fileExtension } from "@/services/media/attachments";
import { createMediaFilename } from "@/services/media/storage";
import type { Attachment } from "@/shared/types";
import { reportError } from "@/shared/utils/devLog";
import {
  type DraftSnapshot,
  isDraftFileRef,
  isDraftKey,
  parseDraftSnapshot,
  serializeDraftSnapshot,
} from "./snapshot";

/** Draft slot for an entry that has not been saved yet; edits use the entry id. */
export const NEW_ENTRY_DRAFT = "new";

const DRAFT_FILE = "draft.json";
// Written first and renamed over DRAFT_FILE, so a crash mid-write keeps the previous draft.
const PENDING_FILE = "draft.pending.json";
const MAX_DRAFT_BYTES = 4 * 1024 * 1024;

// Picker, recorder, and image-manipulator URIs point into the OS cache, which may be
// purged after the app dies, so a draft keeps its own copy of each such file. This
// remembers which copy belongs to which source so autosave copies a file only once.
const copiesByKey = new Map<string, Map<string, string>>();

// One operation at a time per draft, so a slow write cannot land after the discard
// that followed it, while a large copy for one draft never delays opening another.
// Discarding every draft waits for, and blocks, all of them.
const queues = new Map<string, Promise<unknown>>();
let barrier: Promise<unknown> = Promise.resolve();

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const run = Promise.all([queues.get(key), barrier]).then(task);
  queues.set(
    key,
    run.catch(() => undefined)
  );
  return run;
}

function draftsDirectory(): Directory {
  return new Directory(Paths.document, "drafts");
}

function draftDirectory(key: string): Directory {
  if (!isDraftKey(key)) throw new Error("Invalid draft key.");
  return new Directory(draftsDirectory(), key);
}

function documentPrefix(): string {
  const uri = Paths.document.uri;
  return uri.endsWith("/") ? uri : `${uri}/`;
}

/**
 * Returns the stored ref for a live URI, copying files from outside the
 * document directory, or `null` when the file can no longer be copied.
 */
async function toFileRef(options: {
  key: string;
  dir: Directory;
  uri: string;
  copies: Map<string, string>;
}): Promise<string | null> {
  const { key, dir, uri, copies } = options;
  const prefix = documentPrefix();
  if (uri.startsWith(prefix)) {
    const ref = uri.slice(prefix.length);
    if (isDraftFileRef(ref)) return ref;
  }

  const copied = copies.get(uri);
  if (copied && new File(dir, copied).exists) return `drafts/${key}/${copied}`;

  // The saved entry derives its own extension, so the source basename is enough here.
  const filename = createMediaFilename(fileExtension(uri.split("?")[0].split("/").pop() ?? ""));
  const target = new File(dir, filename);
  try {
    await new File(uri).copy(target);
  } catch (error) {
    // A purged cache file must not cost the rest of the draft.
    reportError("drafts:copyFile", error);
    if (target.exists) target.delete();
    return null;
  }
  copies.set(uri, filename);
  return `drafts/${key}/${filename}`;
}

/** Resolves a stored ref to a live URI, or `null` when its file is gone. */
function fromFileRef(ref: string): string | null {
  const file = new File(Paths.document, ref);
  return file.exists ? file.uri : null;
}

/** Deletes draft-owned copies the latest draft no longer references. */
function pruneCopies(options: { key: string; dir: Directory; refs: Set<string> }): void {
  const { key, dir, refs } = options;
  for (const item of dir.list()) {
    if (!(item instanceof File) || item.name === DRAFT_FILE || item.name === PENDING_FILE) continue;
    if (!refs.has(`drafts/${key}/${item.name}`)) item.delete();
  }
  const copies = copiesByKey.get(key);
  if (!copies) return;
  for (const [source, filename] of copies) {
    if (!refs.has(`drafts/${key}/${filename}`)) copies.delete(source);
  }
}

/** Writes the draft for `key`, replacing any earlier one. */
export function writeDraft(key: string, draft: DraftSnapshot): Promise<void> {
  return enqueue(key, async () => {
    const dir = draftDirectory(key);
    dir.create({ idempotent: true, intermediates: true });
    const copies = copiesByKey.get(key) ?? new Map<string, string>();
    copiesByKey.set(key, copies);

    const ref = (uri: string) => toFileRef({ key, dir, uri, copies });
    const refs = async (uris: string[]) =>
      (await Promise.all(uris.map(ref))).filter((uri): uri is string => uri !== null);
    const images = await refs(draft.images);
    const audios = await refs(draft.audios);
    const attachments: Attachment[] = [];
    for (const attachment of draft.attachments) {
      const uri = await ref(attachment.uri);
      if (uri) attachments.push({ ...attachment, uri });
    }

    const pending = new File(dir, PENDING_FILE);
    pending.write(serializeDraftSnapshot({ ...draft, images, audios, attachments }));
    pending.moveSync(new File(dir, DRAFT_FILE), { overwrite: true });

    pruneCopies({
      key,
      dir,
      refs: new Set([...images, ...audios, ...attachments.map((attachment) => attachment.uri)]),
    });
  });
}

/**
 * Reads the draft for `key` with media resolved to live URIs. Files that have
 * since disappeared are dropped; an unreadable draft reads as none.
 */
export function loadDraft(key: string): Promise<DraftSnapshot | null> {
  return enqueue(key, async () => {
    const dir = draftDirectory(key);
    if (!dir.exists) return null;

    // A complete pending file is newer than DRAFT_FILE; a torn one fails to parse.
    for (const name of [PENDING_FILE, DRAFT_FILE]) {
      const file = new File(dir, name);
      if (!file.exists || file.size > MAX_DRAFT_BYTES) continue;
      const stored = parseDraftSnapshot(await file.text());
      if (!stored) continue;

      const resolve = (refs: string[]) =>
        refs.flatMap((ref) => {
          const uri = fromFileRef(ref);
          return uri ? [uri] : [];
        });
      return {
        ...stored,
        images: resolve(stored.images),
        audios: resolve(stored.audios),
        attachments: stored.attachments.flatMap((attachment) => {
          const uri = fromFileRef(attachment.uri);
          return uri ? [{ ...attachment, uri }] : [];
        }),
      };
    }
    return null;
  });
}

/** Removes the draft for `key` and every file only it owned. */
export function discardDraft(key: string): Promise<void> {
  return enqueue(key, async () => {
    copiesByKey.delete(key);
    const dir = draftDirectory(key);
    if (dir.exists) dir.delete();
  });
}

/** Removes every stored draft, e.g. when all entries are deleted. */
export function discardAllDrafts(): Promise<void> {
  const run = Promise.all([...queues.values(), barrier]).then(() => {
    copiesByKey.clear();
    const dir = draftsDirectory();
    if (dir.exists) dir.delete();
  });
  barrier = run.catch(() => undefined);
  return run;
}
