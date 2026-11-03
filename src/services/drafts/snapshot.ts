import type { Attachment, EntryLocation, Tag } from "@/shared/types";

/** Unsaved compose content. Media fields hold live file URIs. */
export interface DraftSnapshot {
  text: string;
  images: string[];
  audios: string[];
  attachments: Attachment[];
  tags: Tag[];
  createdAt: number;
  location: EntryLocation | null;
}

const DRAFT_FORMAT_VERSION = 1;

/**
 * Bounds a restored list so a damaged draft file cannot flood the compose screen.
 * Looser than the compose limits on purpose; those apply when adding media.
 */
const MAX_DRAFT_ITEMS = 50;

// Draft slots are named "new" or by entry id; nothing that could escape the drafts directory.
const KEY_PATTERN = "[A-Za-z0-9-]{1,64}";
const DRAFT_KEY = new RegExp(`^${KEY_PATTERN}$`);
const FILE_REF = new RegExp(`^(media|drafts/${KEY_PATTERN})/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`);

export function isDraftKey(key: string): boolean {
  return DRAFT_KEY.test(key);
}

/**
 * A stored file reference: a path relative to the document directory, either
 * entry media ("media/<file>") or a draft-owned copy ("drafts/<key>/<file>").
 */
export function isDraftFileRef(ref: string): boolean {
  return FILE_REF.test(ref);
}

/** Stable comparison key: two drafts with the same signature store the same content. */
export function draftSignature(draft: DraftSnapshot): string {
  return JSON.stringify([
    draft.text,
    draft.images,
    draft.audios,
    draft.attachments.map((attachment) => [attachment.uri, attachment.name]),
    draft.tags.map((tag) => tag.id),
    draft.createdAt,
    draft.location
      ? [draft.location.latitude, draft.location.longitude, draft.location.name ?? null]
      : null,
  ]);
}

/** Serializes a draft whose media fields already hold file refs. */
export function serializeDraftSnapshot(draft: DraftSnapshot): string {
  return JSON.stringify({ version: DRAFT_FORMAT_VERSION, ...draft });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((ref): ref is string => typeof ref === "string" && isDraftFileRef(ref))
    .slice(0, MAX_DRAFT_ITEMS);
}

function parseAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter((item) => typeof item.uri === "string" && isDraftFileRef(item.uri))
    .slice(0, MAX_DRAFT_ITEMS)
    .map((item) => ({
      uri: item.uri as string,
      name: typeof item.name === "string" && item.name ? item.name : "File",
      mime: typeof item.mime === "string" ? item.mime : undefined,
      size: typeof item.size === "number" ? item.size : undefined,
    }));
}

function parseTags(value: unknown): Tag[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.colorId === "string"
    )
    .slice(0, MAX_DRAFT_ITEMS)
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      colorId: item.colorId as Tag["colorId"],
    }));
}

function parseLocation(value: unknown): EntryLocation | null {
  if (!isRecord(value)) return null;
  const { latitude, longitude, name } = value;
  if (typeof latitude !== "number" || !Number.isFinite(latitude)) return null;
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;
  return typeof name === "string" ? { latitude, longitude, name } : { latitude, longitude };
}

/**
 * Parses a stored draft whose media fields hold file refs. Unknown versions
 * and malformed files yield `null`; malformed fields are dropped individually.
 * Tag colors are refreshed from the database on restore.
 */
export function parseDraftSnapshot(json: string): DraftSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== DRAFT_FORMAT_VERSION) return null;
  if (typeof parsed.createdAt !== "number" || !Number.isFinite(parsed.createdAt)) return null;

  return {
    text: typeof parsed.text === "string" ? parsed.text : "",
    images: parseRefs(parsed.images),
    audios: parseRefs(parsed.audios),
    attachments: parseAttachments(parsed.attachments),
    tags: parseTags(parsed.tags),
    createdAt: parsed.createdAt,
    location: parseLocation(parsed.location),
  };
}
