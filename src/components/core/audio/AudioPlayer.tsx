import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
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
    <View style={styles.wrap}>
      <View style={styles.controls}>
        <Pressable
          onPress={() => skipBy(-PLAYBACK_SKIP_SECONDS)}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
          accessibilityLabel={`Skip back ${PLAYBACK_SKIP_SECONDS} seconds`}
        >
          <Feather name="rotate-ccw" size={metrics.iconSm} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={togglePlayback}
          style={({ pressed }) => [
            styles.playBtn,
            { borderColor: colors.line, backgroundColor: colors.surfaceMuted },
            pressed && styles.pressed,
          ]}
          accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={metrics.iconSm}
            color={colors.text}
          />
        </Pressable>

        <Pressable
          onPress={() => skipBy(PLAYBACK_SKIP_SECONDS)}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
          accessibilityLabel={`Skip forward ${PLAYBACK_SKIP_SECONDS} seconds`}
        >
          <Feather name="rotate-cw" size={metrics.iconSm} color={colors.textSecondary} />
        </Pressable>
      </View>

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
        <AudioWaveform seed={uri} progress={progress} height={28} />
      </Pressable>

      <ThemedText style={[typography.caption, styles.time, { color: colors.textSecondary }]}>
        {timeLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: space.sm,
    paddingVertical: space.xs,
    gap: space.sm,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  skipBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  trackPress: {
    width: "100%",
    paddingVertical: space.xs,
  },
  time: {
    textAlign: "right",
  },
  pressed: {
    opacity: 0.65,
  },
});
