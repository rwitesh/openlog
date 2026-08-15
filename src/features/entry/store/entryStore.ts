import { useSyncExternalStore } from "react";

import { deleteMedia, deleteMediaList } from "@/services/media";
import {
  createEntry,
  deleteAllEntries,
  deleteEntry,
  getEntries,
  removeImageFromEntry,
  updateEntry,
  type NewEntryInput,
  type UpdateEntryInput,
} from "@/services/db/entries";
import type { Entry } from "@/shared/types";

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

function sortNewestFirst(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
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

export async function patchEntry(id: string, input: UpdateEntryInput) {
  const entry = await updateEntry(id, input);
  entries = sortNewestFirst(
    entries.map((existing) => (existing.id === id ? entry : existing))
  );
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

export function useEntries() {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  return {
    entries: list,
    addEntry,
    patchEntry,
    removeEntry,
    removeImage,
    clearAll,
  };
}
