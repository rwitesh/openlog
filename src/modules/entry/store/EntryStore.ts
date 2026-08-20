import { useSyncExternalStore } from "react";
import {
  createEntry,
  deleteAllEntries,
  deleteEntry,
  getEntries,
  type NewEntryInput,
  type UpdateEntryInput,
  updateEntry,
} from "@/services/db/entries";
import { deleteMedia, deleteMediaList } from "@/services/media";
import type { Entry } from "@/shared/types";

let entries: Entry[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => {
    listener();
  });
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
  entries = sortNewestFirst([entry, ...entries]);
  emit();
  return entry;
}

export async function patchEntry(id: string, input: UpdateEntryInput) {
  const entry = await updateEntry(id, input);
  entries = sortNewestFirst(entries.map((existing) => (existing.id === id ? entry : existing)));
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
  const existing = entries.find((e) => e.id === entryId);
  if (!existing || imageIndex < 0 || imageIndex >= existing.images.length) return null;
  const removedUri = existing.images[imageIndex];
  const nextImages = existing.images.filter((_, i) => i !== imageIndex);
  await deleteMedia(removedUri);
  const updated = await updateEntry(entryId, { images: nextImages });
  entries = entries.map((e) => (e.id === entryId ? updated : e));
  emit();
  return updated;
}

export async function removeAudio(entryId: string, audioIndex: number) {
  const existing = entries.find((e) => e.id === entryId);
  if (!existing || audioIndex < 0 || audioIndex >= existing.audios.length) return null;
  const removedUri = existing.audios[audioIndex];
  const nextAudios = existing.audios.filter((_, i) => i !== audioIndex);
  await deleteMedia(removedUri);
  const updated = await updateEntry(entryId, { audios: nextAudios });
  entries = entries.map((e) => (e.id === entryId ? updated : e));
  emit();
  return updated;
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
    removeAudio,
    clearAll,
  };
}
