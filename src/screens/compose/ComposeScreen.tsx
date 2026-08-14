import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/hooks/useEntries";
import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { canSaveComposer, fromComposer, useRecording } from "@/lib";
import { KeyboardLayout, useKeepKeyboard } from "@/keyboard";
import { DraftPreview, RecordingBar } from "@/components/core/audio";
import { Toolbar } from "@/components/compose";

type ComposeProps = NativeStackScreenProps<RootStackParamList, "Compose">;

export function ComposeScreen({ navigation }: ComposeProps) {
  const { colors } = useTheme().theme;
  const { addEntry } = useEntries();

  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recording = useRecording();
  const keepKeyboard = useKeepKeyboard(inputRef);

  const audioUri = recording.recordedUri;
  const isRecording = recording.isRecording;
  const hasAudioDraft = Boolean(audioUri && !isRecording);
  const canSave =
    canSaveComposer({ text, imageUri, audioUri }) && !isRecording && !saving;

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      keepKeyboard();
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      const input = await fromComposer({
        text: text.trim() || undefined,
        imageUri,
        audioUri,
        durationMs: recording.recordedDurationMs,
      });
      if (input) await addEntry(input);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardLayout>
      <KeyboardLayout.Main>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Write something…"
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
          autoFocus
          blurOnSubmit={false}
          textAlignVertical="top"
          style={[styles.input, typography.composerText, { color: colors.text }]}
        />
      </KeyboardLayout.Main>

      <KeyboardLayout.Avoiding>
      {imageUri ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
          <Pressable
            onPress={() => setImageUri(undefined)}
            hitSlop={space.sm}
            style={[styles.removeBadge, { backgroundColor: colors.surface }]}
            accessibilityLabel="Remove image"
          >
            <Feather name="x" size={metrics.iconXs} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      {hasAudioDraft && audioUri ? (
        <View style={styles.mediaWrap}>
          <DraftPreview
            uri={audioUri}
            durationMs={recording.recordedDurationMs ?? 0}
            levels={recording.recordedLevels}
            onRemove={recording.clear}
          />
        </View>
      ) : null}

      <KeyboardLayout.Footer>
        <Toolbar>
        {!isRecording ? (
          <Pressable
            onPress={pickImage}
            hitSlop={space.sm}
            style={({ pressed }) => [styles.toolBtn, pressed && press]}
            accessibilityLabel="Add photo"
          >
            <Feather name="image" size={metrics.iconMd} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={async () => {
            await recording.toggle();
            keepKeyboard();
          }}
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
          <View style={styles.recTool}>
            <RecordingBar
              isRecording={isRecording}
              durationMs={recording.durationMs}
              levels={recording.liveLevels}
            />
          </View>
        ) : (
          <View style={styles.spacer} />
        )}

        <Pressable
          onPress={handleSave}
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
      </KeyboardLayout.Footer>
      </KeyboardLayout.Avoiding>
    </KeyboardLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingTop: space.lg,
    paddingHorizontal: space.xxl,
  },
  previewRow: {
    alignSelf: "flex-start",
    marginBottom: space.sm,
    marginHorizontal: space.xxl,
  },
  mediaWrap: {
    marginHorizontal: space.xxl,
  },
  recTool: {
    flex: 1,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
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
  toolBtn: {
    width: metrics.fabSize,
    height: metrics.fabSize,
    borderRadius: metrics.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: metrics.fabSize,
    height: metrics.fabSize,
    borderRadius: metrics.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    flex: 1,
  },
});
