import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatDurationMs, liveWaveformLevels, meteringToLevel } from "@/lib";
import { ThemedText } from "@/components/core/ui";
import { AudioWaveform } from "./AudioWaveform";

interface AudioRecordingBarProps {
  isRecording: boolean;
  durationMs: number;
  metering?: number;
}

export function AudioRecordingBar({
  isRecording,
  durationMs,
  metering,
}: AudioRecordingBarProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const pulse = useRef(new Animated.Value(1)).current;
  const samplesRef = useRef<number[]>([]);
  const [levels, setLevels] = useState<number[]>(() => liveWaveformLevels([]));

  useEffect(() => {
    if (!isRecording) {
      samplesRef.current = [];
      setLevels(liveWaveformLevels([]));
      return;
    }

    const level = meteringToLevel(metering);
    samplesRef.current.push(level);
    if (samplesRef.current.length > 60) {
      samplesRef.current.shift();
    }
    setLevels(liveWaveformLevels(samplesRef.current));
  }, [isRecording, metering]);

  useEffect(() => {
    if (!isRecording) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [isRecording, pulse]);

  if (!isRecording) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Animated.View
          style={[styles.dot, { backgroundColor: colors.destructive, opacity: pulse }]}
        />
        <ThemedText style={[typography.caption, { color: colors.destructive }]}>
          Recording
        </ThemedText>
        <ThemedText
          style={[typography.caption, styles.timer, { color: colors.textSecondary }]}
        >
          {formatDurationMs(durationMs)}
        </ThemedText>
      </View>

      <AudioWaveform levels={levels} progress={1} height={36} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.lg,
    gap: space.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timer: {
    marginLeft: "auto",
    fontVariant: ["tabular-nums"],
  },
});
