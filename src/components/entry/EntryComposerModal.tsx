import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import {
  canSaveComposer,
  formatDurationMs,
  useAudioRecording,
  type ComposerResult,
} from "@/lib";
import { AudioRecordingBar, ThemedText } from "@/components/core";

export type { ComposerResult };

interface EntryComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (result: ComposerResult) => Promise<void>;
}

export function EntryComposerModal({ visible, onClose, onSave }: EntryComposerModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const recording = useAudioRecording();
  const audioUri = recording.recordedUri;
  const audioDurationMs = recording.recordedDurationMs;

  const reset = () => {
    setText("");
    setImageUri(undefined);
    recording.clear();
  };

  useEffect(() => {
    if (!visible) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const draft: ComposerResult = {
    text,
    imageUri,
    audioUri,
    durationMs: audioDurationMs,
  };
  const canSave = canSaveComposer(draft);

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 0.85,
      selectionLimit: 1,
    });

    if (result.canceled) return;
    setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      await onSave({
        text: text.trim() || undefined,
        imageUri,
        audioUri,
        durationMs: audioDurationMs,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + space.xl,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.line }]} />

            <TextInput
              value={text}
              onChangeText={setText}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={2000}
              autoFocus
              textAlignVertical="top"
              style={[styles.input, typography.composerText, { color: colors.text }]}
            />

            {imageUri ? (
              <View style={styles.previewRow}>
                <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
                <Pressable
                  onPress={() => setImageUri(undefined)}
                  hitSlop={space.sm}
                  style={[styles.removeBadge, { backgroundColor: colors.surface }]}
                  accessibilityLabel="Remove image"
                >
                  <Feather name="x" size={14} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}

            <AudioRecordingBar
              isRecording={recording.isRecording}
              durationMs={recording.durationMs}
              metering={recording.metering}
            />

            {audioUri && !recording.isRecording ? (
              <View style={styles.audioRow}>
                <Feather name="mic" size={metrics.iconSm} color={colors.textSecondary} />
                <ThemedText style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  Voice note · {formatDurationMs(audioDurationMs ?? 0)}
                </ThemedText>
                <Pressable onPress={recording.clear} hitSlop={space.sm}>
                  <Feather name="x" size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.toolbar}>
              <Pressable
                onPress={pickImage}
                hitSlop={space.sm}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                accessibilityLabel="Add photo"
              >
                <Feather name="image" size={metrics.iconMd} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                onPress={recording.toggle}
                hitSlop={space.sm}
                style={({ pressed }) => [
                  styles.iconBtn,
                  recording.isRecording && { backgroundColor: colors.destructive },
                  pressed && styles.pressed,
                ]}
                accessibilityLabel={recording.isRecording ? "Stop recording" : "Record audio"}
              >
                <Feather
                  name="mic"
                  size={metrics.iconMd}
                  color={recording.isRecording ? colors.background : colors.textSecondary}
                />
              </Pressable>

              <View style={styles.spacer} />

              <Pressable
                onPress={handleSave}
                disabled={!canSave || saving}
                hitSlop={space.sm}
                style={({ pressed }) => [
                  styles.iconBtn,
                  canSave && { backgroundColor: colors.marker },
                  pressed && canSave && styles.pressed,
                ]}
                accessibilityLabel="Save entry"
              >
                <Feather
                  name="check"
                  size={metrics.iconMd}
                  color={canSave ? colors.background : colors.textTertiary}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: space.xl,
    borderTopRightRadius: space.xl,
    paddingHorizontal: space.xxl,
    paddingTop: space.md,
  },
  handle: {
    alignSelf: "center",
    width: 32,
    height: 3,
    borderRadius: 2,
    marginBottom: space.xl,
  },
  input: {
    minHeight: 140,
    maxHeight: 240,
    marginBottom: space.lg,
    paddingTop: 0,
  },
  previewRow: {
    alignSelf: "flex-start",
    marginBottom: space.lg,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: space.md,
  },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginBottom: space.lg,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.65,
  },
});
