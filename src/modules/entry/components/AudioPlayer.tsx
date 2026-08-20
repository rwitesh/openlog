import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePlayback } from "@/services/audio/usePlayback";
import { AudioWaveform } from "@/shared/components/AudioWaveform";
import { ThemedText } from "@/shared/components/ThemedText";
import { clampRatio } from "@/shared/utils/duration";
import { metrics, press, radius, space, typography, useTheme } from "@/theme";

interface AudioPlayerProps {
  uri: string;
}

export function AudioPlayer({ uri }: AudioPlayerProps) {
  const { colors } = useTheme().theme;
  const { player, status, totalMs, progress, isPlaying, toggle, timeLabel } = usePlayback(uri);
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
