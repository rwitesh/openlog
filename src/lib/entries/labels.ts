import type { EntryType } from "@/types/entry";

const TYPE_LABELS: Record<EntryType, string> = {
  text: "Text",
  image: "Photo",
  audio: "Audio",
};

export function typeLabel(type: EntryType): string {
  return TYPE_LABELS[type];
}
