import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { clampRatio } from "@/lib/duration";
import {
  LIVE_WAVEFORM_BAR_COUNT,
  WAVEFORM_BAR_COUNT,
  liveWaveformLevels,
  waveformHeights,
} from "@/lib/audio";

interface AudioWaveformProps {
  /** Bar heights normalized to 0–1. */
  levels?: number[];
  /** Seed for the static waveform when levels are not provided. */
  seed?: string;
  /** Playback progress from 0–1 (highlights played portion). */
  progress?: number;
  height?: number;
  /** Live recording mode — no progress tint, just levels. */
  variant?: "playback" | "live";
}

export function AudioWaveform({
  levels,
  seed = "waveform",
  progress = 0,
  height = 28,
  variant = "playback",
}: AudioWaveformProps) {
  const { colors } = useTheme().theme;
  const count = variant === "live" ? LIVE_WAVEFORM_BAR_COUNT : WAVEFORM_BAR_COUNT;

  const bars = useMemo(
    () => (levels?.length ? liveWaveformLevels(levels, count) : waveformHeights(seed, count)),
    [levels, count, seed]
  );

  const clamped = clampRatio(progress);
  const isLive = variant === "live";

  return (
    <View style={[styles.wrap, { height }]}>
      {bars.map((level, index) => {
        const active = !isLive && (index + 1) / bars.length <= clamped;

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: Math.max(3, level * height),
                backgroundColor: isLive || active ? colors.marker : colors.line,
                opacity: isLive ? 0.55 + level * 0.45 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 0,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
    maxWidth: 6,
  },
});
