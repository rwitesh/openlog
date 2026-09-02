import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";

import { analytics } from "@/config/analytics";
import { useRecording } from "@/services/audio";
import { downscaleImage, pickDocuments } from "@/services/media";
import type { Attachment, Entry } from "@/shared/types";
import { MAX_ATTACHMENTS, MAX_IMAGES } from "../types";

/**
 * Photos, voice notes, and kept documents attached to a compose draft, plus
 * the side effects that capture them (picker permissions, recorder lifecycle).
 * Isolated here so the screen's render loop stays free of media concerns.
 */
export function useMediaAttachments(existing?: Entry) {
  const [images, setImages] = useState<string[]>(() => existing?.images ?? []);
  const [audios, setAudios] = useState<string[]>(() => existing?.audios ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(() => existing?.attachments ?? []);

  const {
    isRecording,
    durationMs: recordingDurationMs,
    liveLevels: recordingLevels,
    recordedUri,
    toggle,
    cancel,
    clear,
  } = useRecording();

  // Commit a finished take into the attachments list so the next recording
  // starts from a clean slate.
  useEffect(() => {
    if (!recordedUri || isRecording) return;
    setAudios((prev) => (prev.includes(recordedUri) ? prev : [...prev, recordedUri]));
    clear();
  }, [recordedUri, isRecording, clear]);

  const pickImage = useCallback(async () => {
    if (images.length >= MAX_IMAGES) return;

    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      // Full quality here — downscaleImage performs the only re-encode.
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (!result.canceled) {
      // Shrink before state so the preview and the durable copy share one small file.
      const downscaled = await Promise.all(
        result.assets.map((asset) => downscaleImage(asset.uri, asset))
      );
      setImages((prev) => [...prev, ...downscaled]);
      analytics.capture("photo_attached", { photo_count: downscaled.length });
    }
  }, [images.length]);

  const pickAttachments = useCallback(async () => {
    if (attachments.length >= MAX_ATTACHMENTS) return;

    const picked = await pickDocuments(MAX_ATTACHMENTS - attachments.length);
    if (picked.length > 0) {
      setAttachments((prev) => [...prev, ...picked]);
      analytics.capture("file_attached", { file_count: picked.length });
    }
  }, [attachments.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeAudio = useCallback((index: number) => {
    setAudios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Discard edits and restore the entry's stored media. */
  const reset = useCallback(() => {
    // Stop the mic and drop any in-progress or finished-but-unsaved take.
    void cancel();
    setImages(existing?.images ?? []);
    setAudios(existing?.audios ?? []);
    setAttachments(existing?.attachments ?? []);
    clear();
  }, [existing, cancel, clear]);

  return {
    images,
    audios,
    attachments,
    isRecording,
    recordingDurationMs,
    recordingLevels,
    pickImage,
    pickAttachments,
    removeImage,
    removeAudio,
    removeAttachment,
    toggleRecording: toggle,
    reset,
  };
}
