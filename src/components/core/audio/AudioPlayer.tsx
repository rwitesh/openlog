import { useEffect, useMemo, useState } from "react";
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
import {
  clampRatio,
  formatDurationMs,
  PLAYBACK_POLL_MS,
  PLAYBACK_SKIP_SECONDS,
} from "@/lib";
import { ThemedText } from "@/components/core/ui";
import { AudioWaveform } from "./AudioWaveform";

interface AudioPlayerProps {
  uri: string;
  durationMs?: number;
}

export function AudioPlayer({ uri, durationMs }: AudioPlayerProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const player = useAudioPlayer(uri, { updateInterval: PLAYBACK_POLL_MS });
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const totalMs = durationMs ?? Math.round((status.duration || 0) * 1000);
  const currentMs = Math.round((status.currentTime || 0) * 1000);
  const progress = totalMs > 0 ? clampRatio(currentMs / totalMs) : 0;
  const isPlaying = status.playing;

  const togglePlayback = () => {
    if (!status.isLoaded) return;
    if (isPlaying) player.pause();
    else player.play();
  };

  const skipBy = (deltaSec: number) => {
    if (!status.isLoaded) return;
    const totalSec = totalMs / 1000;
    const next = Math.min(Math.max(0, (status.currentTime || 0) + deltaSec), totalSec);
    player.seekTo(next);
  };

  const seekToRatio = (ratio: number) => {
    if (!status.isLoaded || totalMs <= 0) return;
    player.seekTo(clampRatio(ratio) * (totalMs / 1000));
  };

  const timeLabel = useMemo(() => {
    if (isPlaying || currentMs > 0) {
      return `${formatDurationMs(currentMs)} / ${formatDurationMs(totalMs)}`;
    }
    return formatDurationMs(totalMs);
  }, [currentMs, isPlaying, totalMs]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.row}>
        <Pressable
          onPress={() => skipBy(-PLAYBACK_SKIP_SECONDS)}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityLabel={`Skip back ${PLAYBACK_SKIP_SECONDS} seconds`}
        >
          <Feather name="rotate-ccw" size={15} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={togglePlayback}
          style={({ pressed }) => [
            styles.playBtn,
            { backgroundColor: colors.marker },
            pressed && styles.pressed,
          ]}
          accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={metrics.iconSm}
            color={colors.background}
          />
        </Pressable>

        <Pressable
          onPress={() => skipBy(PLAYBACK_SKIP_SECONDS)}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityLabel={`Skip forward ${PLAYBACK_SKIP_SECONDS} seconds`}
        >
          <Feather name="rotate-cw" size={15} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={(event) => {
            if (!trackWidth) return;
            seekToRatio(event.nativeEvent.locationX / trackWidth);
          }}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          style={styles.trackPress}
          accessibilityLabel="Seek audio"
          accessibilityRole="adjustable"
        >
          <AudioWaveform seed={uri} progress={progress} height={26} />
        </Pressable>

        <ThemedText style={[typography.caption, styles.time, { color: colors.textSecondary }]}>
          {timeLabel}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: space.sm,
    borderRadius: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  trackPress: {
    flex: 1,
    minWidth: 0,
    paddingVertical: space.xs,
  },
  time: {
    minWidth: 52,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  pressed: {
    opacity: 0.65,
  },
});
