import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
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
import { formatComposeDate, formatComposeTime, withTimeOfDay } from "@/lib/dates";
import { KeyboardLayout, useKeepKeyboard } from "@/keyboard";
import { CalendarPicker, DraftPreview, RecordingBar, TimePicker, Toolbar } from "@/components/core";
import { ThemedText } from "@/components/core/ui";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

const MAX_IMAGES = 10;

export function Compose({ navigation }: Props) {
  const { colors } = useTheme().theme;
  const { addEntry } = useEntries();

  const [text, setText] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [composedAt, setComposedAt] = useState(() => Date.now());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recording = useRecording();
  const keepKeyboard = useKeepKeyboard(inputRef);

  const audioUri = recording.recordedUri;
  const isRecording = recording.isRecording;
  const hasAudioDraft = Boolean(audioUri && !isRecording);
  const canSave =
    canSaveComposer({ text, imageUris, audioUri }) && !isRecording && !saving;

  const pickImage = async () => {
    if (imageUris.length >= MAX_IMAGES) return;

    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;

    const remaining = MAX_IMAGES - imageUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setImageUris((prev) => [
        ...prev,
        ...result.assets.map((asset) => asset.uri),
      ]);
      keepKeyboard();
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      const input = await fromComposer({
        text: text.trim() || undefined,
        imageUris: imageUris.length ? imageUris : undefined,
        audioUri,
        durationMs: recording.recordedDurationMs,
        createdAt: composedAt,
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
        <View style={styles.whenRow}>
          <Pressable
            onPress={() => setDatePickerOpen(true)}
            style={({ pressed }) => [
              styles.whenBadge,
              { backgroundColor: colors.surfaceMuted },
              pressed && press,
            ]}
            accessibilityLabel="Change entry date"
            accessibilityRole="button"
          >
            <Feather name="calendar" size={metrics.iconSm} color={colors.text} />
            <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
              {formatComposeDate(composedAt)}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setTimePickerOpen(true)}
            style={({ pressed }) => [
              styles.whenBadge,
              { backgroundColor: colors.surfaceMuted },
              pressed && press,
            ]}
            accessibilityLabel="Change entry time"
            accessibilityRole="button"
          >
            <Feather name="clock" size={metrics.iconSm} color={colors.text} />
            <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
              {formatComposeTime(composedAt)}
            </ThemedText>
          </Pressable>
        </View>
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
      {imageUris.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewScroll}
          keyboardShouldPersistTaps="handled"
        >
          {imageUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.previewRow}>
              <Image source={{ uri }} style={styles.preview} contentFit="cover" />
              <Pressable
                onPress={() => removeImage(index)}
                hitSlop={space.sm}
                style={[styles.removeBadge, { backgroundColor: colors.surface }]}
                accessibilityLabel="Remove image"
              >
                <Feather name="x" size={metrics.iconXs} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
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
            disabled={imageUris.length >= MAX_IMAGES}
            hitSlop={space.sm}
            style={({ pressed }) => [
              styles.toolBtn,
              imageUris.length >= MAX_IMAGES && styles.toolBtnDisabled,
              pressed && press,
            ]}
            accessibilityLabel="Add photo"
          >
            <Feather
              name="image"
              size={metrics.iconMd}
              color={
                imageUris.length >= MAX_IMAGES ? colors.textTertiary : colors.textSecondary
              }
            />
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

      <CalendarPicker
        visible={datePickerOpen}
        selectedDate={composedAt}
        onSelectDate={(dayTs) => setComposedAt((prev) => withTimeOfDay(dayTs, prev))}
        onClose={() => setDatePickerOpen(false)}
      />

      <TimePicker
        visible={timePickerOpen}
        value={composedAt}
        onChange={(ts) => setComposedAt(ts)}
        onClose={() => setTimePickerOpen(false)}
      />
    </KeyboardLayout>
  );
}

const styles = StyleSheet.create({
  whenRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.lg,
    marginBottom: space.sm,
    marginHorizontal: space.xxl,
  },
  whenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
  },
  input: {
    flex: 1,
    paddingTop: space.sm,
    paddingHorizontal: space.xxl,
  },
  previewScroll: {
    gap: space.sm,
    paddingHorizontal: space.xxl,
    marginBottom: space.sm,
  },
  previewRow: {
    position: "relative",
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
  spacer: {
    flex: 1,
  },
});
