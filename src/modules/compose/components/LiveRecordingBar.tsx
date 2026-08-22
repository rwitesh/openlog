import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { AudioWaveform } from "@/shared/components/AudioWaveform";
import { ThemedText } from "@/shared/components/ThemedText";
import { formatDurationMs } from "@/shared/utils/duration";
import { radius, space, typography, useTheme } from "@/theme";

interface RecordingBarProps {
  isRecording: boolean;
  durationMs: number;
  levels: number[];
}

/** Compact live recording strip — timer + waveform only. */
export function LiveRecordingBar({ isRecording, durationMs, levels }: RecordingBarProps) {
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
      <ThemedText style={[typography.caption, styles.timer, { color: colors.text }]}>
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
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    minHeight: 34,
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
