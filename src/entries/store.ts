import { useSyncExternalStore } from "react";

import { deleteMedia, deleteMediaList } from "@/lib";
import { resetDatabase } from "@/db/database";
import {
  createEntry,
  deleteAllEntries,
  deleteEntry,
  getEntries,
  removeImageFromEntry,
  type NewEntryInput,
} from "@/db/entries";
import type { Entry } from "@/types/entry";

let entries: Entry[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return entries;
}

export async function loadEntries() {
  entries = await getEntries();
  emit();
}

export async function addEntry(input: NewEntryInput) {
  const entry = await createEntry(input);
  entries = [entry, ...entries];
  emit();
  return entry;
}

export async function removeEntry(id: string) {
  const uris = await deleteEntry(id);
  await deleteMediaList(uris);
  entries = entries.filter((e) => e.id !== id);
  emit();
}

export async function removeImage(entryId: string, imageIndex: number) {
  const { entry, removedUri } = await removeImageFromEntry(entryId, imageIndex);
  await deleteMedia(removedUri);
  entries =
    entry === null
      ? entries.filter((e) => e.id !== entryId)
      : entries.map((e) => (e.id === entryId ? entry : e));
  emit();
  return entry;
}

export async function clearAll() {
  const uris = await deleteAllEntries();
  entries = [];
  emit();
  return uris;
}

export async function resetDb() {
  const uris = await resetDatabase();
  entries = [];
  emit();
  return uris;
}

export function useEntries() {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  return {
    entries: list,
    addEntry,
    removeEntry,
    removeImage,
    clearAll,
    resetDb,
  };
}
