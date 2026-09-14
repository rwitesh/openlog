import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { addEntry, patchEntry } from "@/modules/entry";
import { getTags } from "@/services/db/tags";
import { getCachedPlace, useLocation } from "@/services/location";
import type { Attachment, Entry, Tag } from "@/shared/types";
import { getInitialWhen } from "@/shared/utils/dates";
import { logDevWarning } from "@/shared/utils/devLog";
import { canSaveDraft, fromDraft } from "../utils/DraftTransform";

/** What `save` did, so the screen can navigate accordingly. */
export type SaveOutcome = "created" | "updated" | "aborted";

interface ComposeMedia {
  images: string[];
  audios: string[];
  attachments: Attachment[];
  isRecording: boolean;
}

/**
 * Scalar draft state (text, timestamp, location) plus the pipeline that
 * persists the whole draft — media included — into a stored entry.
 */
export function useComposeDraft(
  existing: Entry | undefined,
  media: ComposeMedia,
  initialDate?: number
) {
  const [text, setText] = useState(() => existing?.text ?? "");
  const [tags, setTags] = useState<Tag[]>(() => existing?.tags ?? []);
  const [when, setWhen] = useState(() => getInitialWhen(existing?.createdAt, initialDate));
  const [saving, setSaving] = useState(false);
  const location = useLocation(existing ? existing.location : getCachedPlace());

  useEffect(() => {
    if (!existing) return;
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
      .catch((error) => logDevWarning("compose:refreshTags", error));
    return () => {
      active = false;
    };
  }, [existing]);

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

      if (existing) {
        await patchEntry(existing.id, input);
        return "updated";
      }

      await addEntry(input);
      return "created";
    } catch (error) {
      logDevWarning("compose:save", error);
      Alert.alert("Couldn't save", "Something went wrong. Try again.");
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
  ]);

  /** Discard edits and restore the entry's stored draft fields. */
  const reset = useCallback(() => {
    setText(existing?.text ?? "");
    setTags(existing?.tags ?? []);
    setWhen(getInitialWhen(existing?.createdAt, initialDate));
    location.reset();
  }, [existing, initialDate, location.reset]);

  return { text, setText, tags, setTags, when, setWhen, location, canSave, save, reset };
}
