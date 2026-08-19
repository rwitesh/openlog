import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { addEntry, patchEntry } from "@/features/entry";
import { useLocation } from "@/services/location";
import { logDevWarning } from "@/shared/utils/devLog";
import type { Entry } from "@/shared/types";
import { canSaveDraft, fromDraft } from "../utils/DraftTransform";

/** What `save` did, so the screen can navigate accordingly. */
export type SaveOutcome = "created" | "updated" | "aborted";

interface ComposeMedia {
  images: string[];
  audios: string[];
  isRecording: boolean;
}

/**
 * Scalar draft state (text, timestamp, location) plus the pipeline that
 * persists the whole draft — media included — into a stored entry.
 */
export function useComposeDraft(existing: Entry | undefined, media: ComposeMedia) {
  const [text, setText] = useState(() => existing?.text ?? "");
  const [when, setWhen] = useState(() => existing?.createdAt ?? Date.now());
  const [saving, setSaving] = useState(false);
  const location = useLocation(existing?.location);

  const canSave =
    canSaveDraft({ text, images: media.images, audios: media.audios }) &&
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
  }, [canSave, text, media.images, media.audios, when, location.on, location.place, existing]);

  /** Discard edits and restore the entry's stored draft fields. */
  const reset = useCallback(() => {
    setText(existing?.text ?? "");
    setWhen(existing?.createdAt ?? Date.now());
    location.reset();
  }, [existing, location.reset]);

  return { text, setText, when, setWhen, location, canSave, save, reset };
}
