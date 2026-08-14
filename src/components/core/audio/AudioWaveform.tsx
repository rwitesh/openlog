import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { LIVE_WAVEFORM_BAR_COUNT, WAVEFORM_BAR_COUNT } from "@/lib/audio";
import { liveWaveformLevels } from "@/lib/audio/waveform";

interface AudioWaveformProps {
  /** Bar heights normalized to 0–1. */
  levels?: number[];
  /** Seed used to generate a static waveform when levels are not provided. */
  seed?: string;
  /** Playback progress from 0–1 (highlights played portion). */
  progress?: number;
  height?: number;
  barCount?: number;
  /** Live recording mode — no progress tint, just levels. */
  variant?: "playback" | "live";
}

export function AudioWaveform({
  levels,
  seed = "waveform",
  progress = 0,
  height = 28,
  barCount,
  variant = "playback",
}: AudioWaveformProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const resolvedCount =
    barCount ?? (variant === "live" ? LIVE_WAVEFORM_BAR_COUNT : WAVEFORM_BAR_COUNT);

  const bars = useMemo(() => {
    if (levels?.length) {
      return liveWaveformLevels(levels, resolvedCount);
    }

    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const generated: number[] = [];
    for (let i = 0; i < resolvedCount; i += 1) {
      hash = (hash * 1103515245 + 12345) | 0;
      generated.push(0.2 + (Math.abs(hash) % 65) / 100);
    }
    return generated;
  }, [levels, resolvedCount, seed]);

  const clampedProgress = Math.min(1, Math.max(0, progress));
  const isLive = variant === "live";

  return (
    <View style={[styles.wrap, { height }]}>
      {bars.map((level, index) => {
        const barProgress = (index + 1) / bars.length;
        const active = !isLive && barProgress <= clampedProgress;
        const barHeight = Math.max(3, level * height);

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: isLive
                  ? colors.marker
                  : active
                    ? colors.marker
                    : colors.line,
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
