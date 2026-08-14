import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { clampRatio, usePlayback } from "@/lib";
import { ThemedText } from "@/components/core/ui";
import { AudioWaveform } from "./AudioWaveform";

interface AudioPlayerProps {
  uri: string;
  durationMs?: number;
}

export function AudioPlayer({ uri, durationMs }: AudioPlayerProps) {
  const { colors } = useTheme().theme;
  const { player, status, totalMs, progress, isPlaying, toggle, timeLabel } = usePlayback(
    uri,
    durationMs
  );
  const [trackWidth, setTrackWidth] = useState(0);

  const seekToRatio = (ratio: number) => {
    if (!status.isLoaded || totalMs <= 0) return;
    player.seekTo(clampRatio(ratio) * (totalMs / 1000));
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.row}>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [
            styles.playBtn,
            { backgroundColor: colors.marker },
            pressed && press,
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
          onPress={(event) => {
            if (!trackWidth) return;
            seekToRatio(event.nativeEvent.locationX / trackWidth);
          }}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          style={styles.trackPress}
          accessibilityLabel="Seek audio"
          accessibilityRole="adjustable"
        >
          <AudioWaveform seed={uri} progress={progress} height={24} />
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
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  trackPress: {
    flex: 1,
    minWidth: 0,
    paddingVertical: space.xs,
  },
  time: {
    minWidth: 48,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
    fontSize: typography.timestamp.fontSize,
  },
});
