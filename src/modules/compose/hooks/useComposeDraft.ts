import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";

import { addEntry, patchEntry } from "@/modules/entry";
import { getTag, getTags, MAX_TAGS_PER_ENTRY } from "@/services/db/tags";
import { type DraftSnapshot, draftSignature } from "@/services/drafts/snapshot";
import { discardDraft, NEW_ENTRY_DRAFT, writeDraft } from "@/services/drafts/store";
import { getCachedPlace, useLocation } from "@/services/location";
import { MissingMediaError } from "@/services/media";
import type { Attachment, Entry, Tag } from "@/shared/types";
import { getInitialWhen } from "@/shared/utils/dates";
import { reportError } from "@/shared/utils/devLog";
import {
  canSaveDraft,
  entrySnapshot,
  fromDraft,
  isDraftWorthKeeping,
} from "../utils/DraftTransform";

/** What `save` did, so the screen can navigate accordingly. */
export type SaveOutcome = "created" | "updated" | "aborted";

interface ComposeMedia {
  images: string[];
  audios: string[];
  attachments: Attachment[];
  isRecording: boolean;
  reset: (to: Entry | undefined) => void;
}

interface ComposeDraftOptions {
  existing: Entry | undefined;
  /** An unsaved draft to resume; wins over the stored entry and the initial date and tag. */
  restored: DraftSnapshot | null;
  media: ComposeMedia;
  initialDate?: number;
  /** Pre-attaches this tag to a new entry, e.g. when composing from a tag's timeline. */
  initialTagId?: string;
}

/** Autosave delay after the last change; leaving the screen or the app writes at once. */
const DRAFT_WRITE_DELAY_MS = 500;

/**
 * Scalar draft state (text, timestamp, location) plus the pipeline that
 * persists the whole draft — media included — into a stored entry. Until
 * then the draft is autosaved to disk, so leaving the screen, backgrounding,
 * or a crash keeps it for the next time this entry is composed.
 */
export function useComposeDraft({
  existing,
  restored,
  media,
  initialDate,
  initialTagId,
}: ComposeDraftOptions) {
  const [text, setText] = useState(() => restored?.text ?? existing?.text ?? "");
  const [tags, setTags] = useState<Tag[]>(() => restored?.tags ?? existing?.tags ?? []);
  const [when, setWhen] = useState(
    () => restored?.createdAt ?? getInitialWhen(existing?.createdAt, initialDate)
  );
  const [saving, setSaving] = useState(false);
  const location = useLocation(
    restored ? restored.location : existing ? existing.location : getCachedPlace()
  );

  useEffect(() => {
    if (!existing && !restored) return;
    let active = true;
    getTags()
      .then((availableTags) => {
        if (!active) return;
        const byId = new Map(availableTags.map((tag) => [tag.id, tag]));
        setTags((current) =>
          current.flatMap((tag) => {
            const updated = byId.get(tag.id);
            return updated ? [updated] : [];
          })
        );
      })
      .catch((error) => reportError("compose:refreshTags", error));
    return () => {
      active = false;
    };
  }, [existing, restored]);

  useEffect(() => {
    if (existing || restored || !initialTagId) return;
    let active = true;
    getTag(initialTagId)
      .then((tag) => {
        if (!active || !tag) return;
        setTags((current) =>
          current.length >= MAX_TAGS_PER_ENTRY || current.some((item) => item.id === tag.id)
            ? current
            : [tag, ...current]
        );
      })
      .catch((error) => reportError("compose:initialTag", error));
    return () => {
      active = false;
    };
  }, [existing, restored, initialTagId]);

  const draftKey = existing?.id ?? NEW_ENTRY_DRAFT;
  const snapshot = useMemo<DraftSnapshot>(
    () => ({
      text,
      images: media.images,
      audios: media.audios,
      attachments: media.attachments,
      tags,
      createdAt: when,
      location: location.on ? location.place : null,
    }),
    [text, media.images, media.audios, media.attachments, tags, when, location.on, location.place]
  );
  const signature = useMemo(() => draftSignature(snapshot), [snapshot]);
  const latest = useRef({ snapshot, signature, existing, draftKey });
  latest.current = { snapshot, signature, existing, draftKey };
  // Signature of what the draft slot holds now, so unchanged content is never rewritten.
  // Unknown without a restored draft: the first autosave clears any stale one.
  const storedSignature = useRef<string | null>(restored ? signature : null);
  // Set once a new entry is saved: the screen is closing and must not recreate its draft.
  const closed = useRef(false);

  const persistDraft = useCallback(() => {
    const {
      snapshot: current,
      signature: written,
      existing: entry,
      draftKey: key,
    } = latest.current;
    if (closed.current || written === storedSignature.current) return;
    storedSignature.current = written;

    const keep = isDraftWorthKeeping({ draft: current, entry });
    const task = keep ? writeDraft(key, current) : discardDraft(key);
    task.catch((error) => {
      // Let the next change or exit try again.
      if (storedSignature.current === written) storedSignature.current = null;
      reportError("compose:persistDraft", error);
    });
  }, []);

  useEffect(() => {
    if (signature === storedSignature.current) return;
    const timer = setTimeout(persistDraft, DRAFT_WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [signature, persistDraft]);

  // Swiping the app away from recents happens after it leaves the foreground; an
  // unmount covers any exit the screen did not flush. Both keep what changed since the last autosave.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") persistDraft();
    });
    return () => {
      subscription.remove();
      persistDraft();
    };
  }, [persistDraft]);

  const restoreFields = useCallback(
    (entry: Entry) => {
      setText(entry.text ?? "");
      setTags(entry.tags);
      setWhen(entry.createdAt);
      location.reset(entry.location ?? null);
    },
    [location.reset]
  );

  const canSave =
    canSaveDraft({
      text,
      images: media.images,
      audios: media.audios,
      attachments: media.attachments,
    }) &&
    !media.isRecording &&
    !saving;

  const save = useCallback(async (): Promise<SaveOutcome> => {
    if (!canSave) return "aborted";

    setSaving(true);
    try {
      const input = await fromDraft({
        text,
        images: media.images,
        audios: media.audios,
        attachments: media.attachments,
        tags,
        createdAt: when,
        location: location.on && location.place ? location.place : null,
      });
      if (!input) return "aborted";

      // The entry is committed before the draft and its file copies are removed.
      // The discard is queued ahead of any later load, so a reopened compose
      // cannot restore what was just saved.
      if (existing) {
        const saved = await patchEntry(existing.id, input);
        // Show the stored copies; the draft-owned files are about to go.
        restoreFields(saved);
        media.reset(saved);
        storedSignature.current = draftSignature(entrySnapshot(saved));
      } else {
        await addEntry(input);
        closed.current = true;
      }
      discardDraft(draftKey).catch((error) => reportError("compose:discardDraft", error));
      return existing ? "updated" : "created";
    } catch (error) {
      reportError("compose:save", error);
      // A missing media file never succeeds on a retry, so its error carries the way out.
      const message = error instanceof MissingMediaError ? error.message : "Try again.";
      Alert.alert("Couldn't save", message);
      return "aborted";
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    text,
    media.images,
    media.audios,
    media.attachments,
    tags,
    when,
    location.on,
    location.place,
    existing,
    draftKey,
    restoreFields,
    media.reset,
  ]);

  /** Discard edits and restore the entry's stored draft fields. */
  const reset = useCallback(() => {
    if (existing) restoreFields(existing);
  }, [existing, restoreFields]);

  return {
    text,
    setText,
    tags,
    setTags,
    when,
    setWhen,
    location,
    canSave,
    save,
    reset,
    flushDraft: persistDraft,
  };
}
