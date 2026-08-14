import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { clampRatio, formatDurationMs, PLAYBACK_POLL_MS } from "@/lib";
import { ThemedText } from "@/components/core/ui";
import { AudioWaveform } from "./AudioWaveform";

interface DraftPreviewProps {
  uri: string;
  durationMs: number;
  levels?: number[];
  onRemove: () => void;
}

/** Inline preview of a recorded voice note inside the composer. */
export function DraftPreview({
  uri,
  durationMs,
  levels,
  onRemove,
}: DraftPreviewProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const player = useAudioPlayer(uri, { updateInterval: PLAYBACK_POLL_MS });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const totalMs = durationMs || Math.round((status.duration || 0) * 1000);
  const currentMs = Math.round((status.currentTime || 0) * 1000);
  const progress = totalMs > 0 ? clampRatio(currentMs / totalMs) : 0;
  const isPlaying = status.playing;

  const togglePlayback = () => {
    if (!status.isLoaded) return;
    if (isPlaying) player.pause();
    else player.play();
  };

  const timeLabel =
    isPlaying || currentMs > 0
      ? `${formatDurationMs(currentMs)} / ${formatDurationMs(totalMs)}`
      : formatDurationMs(totalMs);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]}>
      <Pressable
        onPress={togglePlayback}
        style={({ pressed }) => [
          styles.playBtn,
          { backgroundColor: colors.marker },
          pressed && styles.pressed,
        ]}
        accessibilityLabel={isPlaying ? "Pause preview" : "Play preview"}
      >
        <Feather
          name={isPlaying ? "pause" : "play"}
          size={metrics.iconSm}
          color={colors.background}
        />
      </Pressable>

      <View style={styles.waveCol}>
        <AudioWaveform levels={levels} seed={uri} progress={progress} height={22} />
        <ThemedText style={[typography.caption, { color: colors.textSecondary }]}>
          {timeLabel}
        </ThemedText>
      </View>

      <Pressable
        onPress={onRemove}
        hitSlop={space.sm}
        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
        accessibilityLabel="Remove voice note"
      >
        <Feather name="x" size={16} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  waveCol: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.65,
  },
});
