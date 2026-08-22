import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Toolbar } from "@/shared/components/Toolbar";
import { metrics, press, space, useTheme } from "@/theme";
import { MAX_IMAGES } from "../types";
import { LiveRecordingBar } from "./LiveRecordingBar";

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

const BUTTON_SIZE = 40;

const styles = StyleSheet.create({
  toolBtn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnDisabled: {
    opacity: 0.45,
  },
  sendBtn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
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
