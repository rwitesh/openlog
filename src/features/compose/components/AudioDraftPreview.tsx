import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { usePlayback } from "@/services/audio/usePlayback";
import { ThemedText } from "@/shared/components/ThemedText";
import { AudioWaveform } from "@/shared/components/AudioWaveform";

interface DraftPreviewProps {
  uri: string;
  durationMs: number;
  levels?: number[];
  onRemove?: () => void;
}

/** Inline preview of a recorded voice note inside the composer. */
export function AudioDraftPreview({ uri, durationMs, levels, onRemove }: DraftPreviewProps) {
  const { colors } = useTheme().theme;
  const { progress, isPlaying, toggle, timeLabel } = usePlayback(uri, durationMs);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.playBtn,
          { backgroundColor: colors.marker },
          pressed && press,
        ]}
        accessibilityLabel={isPlaying ? "Pause preview" : "Play preview"}
      >
        <Feather
          name={isPlaying ? "pause" : "play"}
          size={metrics.iconSm}
          color={colors.background}
        />
      </Pressable>

      <View style={styles.waveCol}>
        <AudioWaveform levels={levels} seed={uri} progress={progress} height={22} />
        <ThemedText style={[typography.caption, { color: colors.textSecondary }]}>
          {timeLabel}
        </ThemedText>
      </View>

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.removeBtn, pressed && press]}
          accessibilityLabel="Remove voice note"
        >
          <Feather name="x" size={metrics.iconSm} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  waveCol: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  removeBtn: {
    width: metrics.btnSm,
    height: metrics.btnSm,
    alignItems: "center",
    justifyContent: "center",
  },
});
