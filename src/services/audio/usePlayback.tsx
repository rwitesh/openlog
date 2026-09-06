import {
  type AudioPlayer,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { clampRatio, formatDurationMs } from "@/shared/utils/duration";
import { PLAYBACK_POLL_MS } from "./constants";

export interface AudioCoordinator {
  activeUri: string | null;
  playTrack: (uri: string, player: AudioPlayer) => void;
  stopTrack: (uri: string, player: AudioPlayer) => void;
  pauseAll: () => void;
}

const AudioContext = createContext<AudioCoordinator | null>(null);

// Fallback coordinator for test or provider-less environments
let fallbackPlayer: AudioPlayer | null = null;
const fallbackCoordinator: AudioCoordinator = {
  activeUri: null,
  playTrack: (_uri: string, player: AudioPlayer) => {
    if (fallbackPlayer && fallbackPlayer !== player) {
      fallbackPlayer.pause();
    }
    fallbackPlayer = player;
  },
  stopTrack: (_uri: string, player: AudioPlayer) => {
    if (fallbackPlayer === player) {
      fallbackPlayer = null;
    }
  },
  pauseAll: () => {
    if (fallbackPlayer) {
      try {
        fallbackPlayer.pause();
      } catch {}
      fallbackPlayer = null;
    }
  },
};

/**
 * Global audio provider ensuring only a single audio track plays at any time.
 * When a new track starts, any currently playing track is paused immediately.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [activeUri, setActiveUri] = useState<string | null>(null);
  const activePlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, []);

  const playTrack = useCallback((uri: string, player: AudioPlayer) => {
    if (activePlayerRef.current && activePlayerRef.current !== player) {
      activePlayerRef.current.pause();
    }
    activePlayerRef.current = player;
    setActiveUri(uri);
  }, []);

  const stopTrack = useCallback((uri: string, player: AudioPlayer) => {
    if (activePlayerRef.current === player) {
      activePlayerRef.current = null;
      setActiveUri((current) => (current === uri ? null : current));
    }
  }, []);

  const pauseAll = useCallback(() => {
    if (activePlayerRef.current) {
      try {
        activePlayerRef.current.pause();
      } catch {}
      activePlayerRef.current = null;
    }
    setActiveUri(null);
  }, []);

  const value = useMemo(
    () => ({
      activeUri,
      playTrack,
      stopTrack,
      pauseAll,
    }),
    [activeUri, playTrack, stopTrack, pauseAll]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export const AudioCoordinatorProvider = AudioProvider;

/** Access the active audio coordinator context. */
export function useAudioCoordinator(): AudioCoordinator {
  const context = useContext(AudioContext);
  return context ?? fallbackCoordinator;
}

export const useAudio = useAudioCoordinator;

/**
 * Playback hook for audio items. Coordinates with AudioProvider to guarantee
 * that starting playback automatically pauses any other playing recording.
 */
export function usePlayback(uri: string) {
  const player = useAudioPlayer(uri, { updateInterval: PLAYBACK_POLL_MS });
  const status = useAudioPlayerStatus(player);
  const coordinator = useAudioCoordinator();

  // Reset active track state when playback reaches the end
  useEffect(() => {
    if (status.didJustFinish) {
      coordinator.stopTrack(uri, player);
    }
  }, [status.didJustFinish, uri, player, coordinator.stopTrack]);

  const totalMs = Math.round((status.duration || 0) * 1000);
  const currentMs = Math.round((status.currentTime || 0) * 1000);
  const progress = totalMs > 0 ? clampRatio(currentMs / totalMs) : 0;
  const isPlaying = status.playing;

  const toggle = () => {
    if (!status.isLoaded) return;

    if (isPlaying) {
      player.pause();
      coordinator.stopTrack(uri, player);
    } else {
      coordinator.playTrack(uri, player);
      // If at or near the end, restart from beginning
      if (status.duration > 0 && status.currentTime >= status.duration - 0.05) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const timeLabel =
    isPlaying || currentMs > 0
      ? `${formatDurationMs(currentMs)} / ${formatDurationMs(totalMs)}`
      : formatDurationMs(totalMs);

  return {
    player,
    status,
    totalMs,
    progress,
    isPlaying,
    toggle,
    timeLabel,
    activeUri: coordinator.activeUri,
  };
}
