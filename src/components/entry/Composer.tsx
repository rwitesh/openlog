import { useEffect, useState } from "react";
import {
  Keyboard,
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
import { canSaveComposer, useRecording, type ComposerResult } from "@/lib";
import { DraftPreview, RecordingBar } from "@/components/core";

export type { ComposerResult };

interface ComposerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (result: ComposerResult) => Promise<void>;
}

export function Composer({ visible, onClose, onSave }: ComposerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const recording = useRecording();
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

  useEffect(() => {
    if (!visible) {
      setKeyboardOpen(false);
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const draft: ComposerResult = {
    text,
    imageUri,
    audioUri,
    durationMs: audioDurationMs,
  };
  const canSave = canSaveComposer(draft);
  const isRecording = recording.isRecording;
  const hasAudioDraft = Boolean(audioUri && !isRecording);
  const sheetPaddingBottom = keyboardOpen ? space.xs : insets.bottom + space.md;

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
                paddingBottom: sheetPaddingBottom,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.line }]} />

            {!isRecording ? (
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write something…"
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={2000}
                autoFocus
                textAlignVertical="top"
                style={[
                  styles.input,
                  typography.composerText,
                  { color: colors.text },
                  hasAudioDraft && styles.inputCompact,
                ]}
              />
            ) : null}

            {imageUri && !isRecording ? (
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

            <RecordingBar
              isRecording={isRecording}
              durationMs={recording.durationMs}
              levels={recording.liveLevels}
            />

            {hasAudioDraft && audioUri ? (
              <DraftPreview
                uri={audioUri}
                durationMs={audioDurationMs ?? 0}
                levels={recording.recordedLevels}
                onRemove={recording.clear}
              />
            ) : null}

            <View style={styles.toolbar}>
              {!isRecording ? (
                <Pressable
                  onPress={pickImage}
                  hitSlop={space.sm}
                  style={({ pressed }) => [styles.toolBtn, pressed && styles.pressed]}
                  accessibilityLabel="Add photo"
                >
                  <Feather name="image" size={metrics.iconMd} color={colors.textSecondary} />
                </Pressable>
              ) : null}

              <Pressable
                onPress={recording.toggle}
                hitSlop={space.sm}
                style={({ pressed }) => [
                  styles.toolBtn,
                  isRecording && { backgroundColor: colors.destructive },
                  pressed && styles.pressed,
                ]}
                accessibilityLabel={isRecording ? "Stop recording" : "Record audio"}
              >
                <Feather
                  name={isRecording ? "square" : "mic"}
                  size={metrics.iconMd}
                  color={isRecording ? colors.background : colors.textSecondary}
                />
              </Pressable>

              <View style={styles.spacer} />

              <Pressable
                onPress={handleSave}
                disabled={!canSave || saving || isRecording}
                hitSlop={space.sm}
                style={({ pressed }) => [
                  styles.sendBtn,
                  canSave && !isRecording && { backgroundColor: colors.marker },
                  pressed && canSave && !isRecording && styles.pressed,
                ]}
                accessibilityLabel="Send entry"
              >
                <Feather
                  name="arrow-up"
                  size={metrics.iconMd + 2}
                  color={canSave && !isRecording ? colors.background : colors.textTertiary}
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
    marginBottom: space.lg,
  },
  input: {
    minHeight: 80,
    maxHeight: 200,
    marginBottom: space.sm,
    paddingTop: 0,
  },
  inputCompact: {
    minHeight: 64,
    maxHeight: 96,
    marginBottom: space.sm,
  },
  previewRow: {
    alignSelf: "flex-start",
    marginBottom: space.sm,
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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
