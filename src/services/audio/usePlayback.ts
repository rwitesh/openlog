import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect } from "react";

import { clampRatio, formatDurationMs } from "@/shared/utils/duration";
import { PLAYBACK_POLL_MS } from "./constants";

/** Playback state for a single audio URI. */
export function usePlayback(uri: string) {
  const player = useAudioPlayer(uri, { updateInterval: PLAYBACK_POLL_MS });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const totalMs = Math.round((status.duration || 0) * 1000);
  const currentMs = Math.round((status.currentTime || 0) * 1000);
  const progress = totalMs > 0 ? clampRatio(currentMs / totalMs) : 0;
  const isPlaying = status.playing;

  const toggle = () => {
    if (!status.isLoaded) return;
    if (isPlaying) {
      player.pause();
    } else {
      // If at or near the end, restart from beginning
      if (status.duration && status.currentTime >= status.duration - 0.05) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const timeLabel =
    isPlaying || currentMs > 0
      ? `${formatDurationMs(currentMs)} / ${formatDurationMs(totalMs)}`
      : formatDurationMs(totalMs);

  return { player, status, totalMs, progress, isPlaying, toggle, timeLabel };
}
