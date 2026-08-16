import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { Toolbar } from "@/shared/components/Toolbar";
import { LiveRecordingBar } from "./LiveRecordingBar";
import { MAX_IMAGES } from "./ComposeAttachments";

interface FooterBarProps {
  imageCount: number;
  isRecording: boolean;
  canSave: boolean;
  recordingDurationMs: number;
  recordingLevels?: number[];
  onPickImage: () => void;
  onToggleRecording: () => void;
  onSave: () => void;
}

export function ComposeFooterBar({
  imageCount,
  isRecording,
  canSave,
  recordingDurationMs,
  recordingLevels,
  onPickImage,
  onToggleRecording,
  onSave,
}: FooterBarProps) {
  const { colors } = useTheme().theme;
  const imagesFull = imageCount >= MAX_IMAGES;

  return (
    <Toolbar>
      {!isRecording ? (
        <Pressable
          onPress={onPickImage}
          disabled={imagesFull}
          hitSlop={space.sm}
          style={({ pressed }) => [
            styles.toolBtn,
            imagesFull && styles.toolBtnDisabled,
            pressed && press,
          ]}
          accessibilityLabel="Add photo"
        >
          <Feather
            name="image"
            size={metrics.iconMd}
            color={imagesFull ? colors.textTertiary : colors.textSecondary}
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onToggleRecording}
        hitSlop={space.sm}
        style={({ pressed }) => [
          styles.toolBtn,
          isRecording && { backgroundColor: colors.destructive },
          pressed && press,
        ]}
        accessibilityLabel={isRecording ? "Stop recording" : "Record audio"}
      >
        <Feather
          name={isRecording ? "square" : "mic"}
          size={metrics.iconMd}
          color={isRecording ? colors.background : colors.textSecondary}
        />
      </Pressable>

      {isRecording ? (
        <View style={styles.recording}>
          <LiveRecordingBar
            isRecording={isRecording}
            durationMs={recordingDurationMs}
            levels={recordingLevels ?? []}
          />
        </View>
      ) : (
        <View style={styles.spacer} />
      )}

      <Pressable
        onPress={onSave}
        disabled={!canSave}
        hitSlop={space.sm}
        style={({ pressed }) => [
          styles.sendBtn,
          canSave && { backgroundColor: colors.marker },
          pressed && canSave && press,
        ]}
        accessibilityLabel="Save entry"
      >
        <Feather
          name="arrow-up"
          size={metrics.iconMd + 2}
          color={canSave ? colors.background : colors.textTertiary}
        />
      </Pressable>
    </Toolbar>
  );
}

const styles = StyleSheet.create({
  toolBtn: {
    width: metrics.fabSize,
    height: metrics.fabSize,
    borderRadius: metrics.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnDisabled: {
    opacity: 0.45,
  },
  sendBtn: {
    width: metrics.fabSize,
    height: metrics.fabSize,
    borderRadius: metrics.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  recording: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
});
