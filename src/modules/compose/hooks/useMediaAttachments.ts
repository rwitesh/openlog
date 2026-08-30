import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";

import { analytics } from "@/config/analytics";
import { useRecording } from "@/services/audio";
import { downscaleImage } from "@/services/media";
import type { Entry } from "@/shared/types";
import { MAX_IMAGES } from "../types";

/**
 * Images and voice notes attached to a compose draft, plus the side effects
 * that capture them (picker permissions, recorder lifecycle). Isolated here
 * so the screen's render loop stays free of media concerns.
 */
export function useMediaAttachments(existing?: Entry) {
  const [images, setImages] = useState<string[]>(() => existing?.images ?? []);
  const [audios, setAudios] = useState<string[]>(() => existing?.audios ?? []);

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

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeAudio = useCallback((index: number) => {
    setAudios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Discard edits and restore the entry's stored media. */
  const reset = useCallback(() => {
    // Stop the mic and drop any in-progress or finished-but-unsaved take.
    void cancel();
    setImages(existing?.images ?? []);
    setAudios(existing?.audios ?? []);
    clear();
  }, [existing, cancel, clear]);

  return {
    images,
    audios,
    isRecording,
    recordingDurationMs,
    recordingLevels,
    pickImage,
    removeImage,
    removeAudio,
    toggleRecording: toggle,
    reset,
  };
}
