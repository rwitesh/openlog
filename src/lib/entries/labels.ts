import type { EntryType } from "@/types/entry";

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  text: "Text",
  image: "Photo",
  audio: "Audio",
};

export function entryTypeLabel(type: EntryType): string {
  return ENTRY_TYPE_LABELS[type];
}
