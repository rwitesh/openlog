import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { WAVEFORM_BAR_COUNT } from "@/lib/audio";

interface AudioWaveformProps {
  /** Bar heights normalized to 0–1. */
  levels?: number[];
  /** Seed used to generate a static waveform when levels are not provided. */
  seed?: string;
  /** Playback or recording progress from 0–1. */
  progress?: number;
  height?: number;
  barCount?: number;
}

export function AudioWaveform({
  levels,
  seed = "waveform",
  progress = 0,
  height = 32,
  barCount = WAVEFORM_BAR_COUNT,
}: AudioWaveformProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const bars = useMemo(() => {
    if (levels?.length) return levels;

    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const generated: number[] = [];
    for (let i = 0; i < barCount; i += 1) {
      hash = (hash * 1103515245 + 12345) | 0;
      generated.push(0.18 + (Math.abs(hash) % 72) / 100);
    }
    return generated;
  }, [barCount, levels, seed]);

  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.wrap, { height }]}>
      {bars.map((level, index) => {
        const barProgress = (index + 1) / bars.length;
        const active = barProgress <= clampedProgress;
        const barHeight = Math.max(4, level * height);

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: active ? colors.marker : colors.line,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
});
