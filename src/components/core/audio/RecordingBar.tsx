import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { typography } from "@/theme/typography";
import { formatDurationMs } from "@/lib";
import { ThemedText } from "@/components/core/ui";
import { AudioWaveform } from "./AudioWaveform";

interface RecordingBarProps {
  isRecording: boolean;
  durationMs: number;
  levels: number[];
}

/** Compact live recording strip — timer + waveform only. */
export function RecordingBar({
  isRecording,
  durationMs,
  levels,
}: RecordingBarProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isRecording) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [isRecording, pulse]);

  if (!isRecording) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]}>
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.destructive, opacity: pulse }]}
      />
      <ThemedText
        style={[typography.caption, styles.timer, { color: colors.text }]}
      >
        {formatDurationMs(durationMs)}
      </ThemedText>
      <AudioWaveform levels={levels} variant="live" height={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 36,
  },
  dot: {
    width: space.sm,
    height: space.sm,
    borderRadius: space.xs,
  },
  timer: {
    minWidth: 36,
    fontVariant: ["tabular-nums"],
  },
});
