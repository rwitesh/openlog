import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Pressable, View, type TextInput } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";

import type { RootStackParamList } from "@/navigation/types";
import type { Entry } from "@/shared/types";
import { EntryDetailsModal, useEntries } from "@/features/entry";
import {
  ComposeAttachments,
  ComposeEditor,
  ComposeFooterBar,
  DateTimeBadges,
  MAX_IMAGES,
  canSaveDraft,
  fromDraft,
} from "@/features/compose";
import { useRecording } from "@/services/audio";
import { useLocation } from "@/services/location";
import { withTimeOfDay } from "@/shared/utils/dates";
import { logDevWarning } from "@/shared/utils/devLog";
import { Layout, useKeepFocus } from "@/shared/components/Layout";
import { CalendarPicker, TimePicker } from "@/shared/pickers";
import { useTheme, useWritingPreferences } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

function entryText(entry: Entry): string {
  if (entry.type === "text") return entry.text;
  return entry.text?.trim() ?? "";
}

function entryImages(entry: Entry): string[] {
  return entry.type === "image" ? entry.uris : [];
}

export function ComposeScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { autoLocation } = useWritingPreferences();

  const entryId = route.params?.entryId;
  const [mode, setMode] = useState<"view" | "edit">(route.params?.mode ?? (entryId ? "view" : "edit"));
  const isReadOnly = Boolean(entryId && mode === "view");

  const { entries, addEntry, patchEntry, removeEntry } = useEntries();
  const existing = entryId ? entries.find((entry) => entry.id === entryId) : undefined;

  const [text, setText] = useState(() => (existing ? entryText(existing) : ""));
  const [imageUris, setImageUris] = useState<string[]>(() =>
    existing ? entryImages(existing) : []
  );
  const [saving, setSaving] = useState(false);
  const [when, setWhen] = useState(() => existing?.createdAt ?? Date.now());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const recording = useRecording();
  const keepFocus = useKeepFocus(inputRef);
  const location = useLocation(text, existing?.location, !existing && autoLocation);

  useEffect(() => {
    if (!entryId) return;
    if (existing) return;
    navigation.goBack();
  }, [entryId, existing, navigation]);

  useLayoutEffect(() => {
    if (isReadOnly) {
      navigation.setOptions({
        title: "Entry",
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Pressable
              onPress={() => setMode("edit")}
              hitSlop={space.md}
              style={({ pressed }) => pressed && press}
              accessibilityRole="button"
              accessibilityLabel="Edit"
            >
              <Feather name="edit-2" size={metrics.iconSm + 2} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => setDetailsOpen(true)}
              hitSlop={space.md}
              style={({ pressed }) => pressed && press}
              accessibilityRole="button"
              accessibilityLabel="Entry details"
            >
              <Feather name="more-vertical" size={metrics.iconSm + 2} color={colors.textSecondary} />
            </Pressable>
          </View>
        ),
      });
    } else if (existing) {
      navigation.setOptions({
        title: "Edit entry",
        headerRight: () => (
          <Pressable
            onPress={() => {
              setText(entryText(existing));
              setWhen(existing.createdAt);
              setMode("view");
            }}
            hitSlop={space.md}
            style={({ pressed }) => pressed && press}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Feather name="x" size={metrics.iconMd} color={colors.textSecondary} />
          </Pressable>
        ),
      });
    } else {
      navigation.setOptions({
        title: "New entry",
        headerRight: undefined,
      });
    }
  }, [navigation, isReadOnly, existing, colors]);

  const audioUri = recording.recordedUri || (existing?.type === "audio" ? existing.uri : undefined);
  const audioDurationMs = recording.recordedUri
    ? recording.recordedDurationMs
    : (existing?.type === "audio" ? existing.durationMs ?? 0 : 0);
  const isRecording = recording.isRecording;
  const hasAudioDraft = Boolean(audioUri && !isRecording);
  const canSave =
    canSaveDraft({ text, imageUris, audioUri }) && !isRecording && !saving;

  const pickImage = async () => {
    if (isReadOnly || imageUris.length >= MAX_IMAGES) return;

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
      keepFocus();
    }
  };

  const removeImage = (index: number) => {
    if (isReadOnly) return;
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      if (existing) {
        await patchEntry(existing.id, {
          text: text.trim(),
          createdAt: when,
          location:
            location.on && location.place ? location.place : null,
        });
        setMode("view");
        return;
      }

      const input = await fromDraft({
        text: text.trim() || undefined,
        imageUris: imageUris.length ? imageUris : undefined,
        audioUri: recording.recordedUri,
        durationMs: recording.recordedDurationMs,
        createdAt: when,
        location:
          location.on && location.place ? location.place : undefined,
      });
      if (!input) {
        Alert.alert("Couldn't save", "Add some text, a photo, or audio first.");
        return;
      }

      await addEntry(input);
      navigation.goBack();
    } catch (error) {
      logDevWarning("compose:save", error);
      Alert.alert("Couldn't save", "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRecording = async () => {
    if (isReadOnly) return;
    await recording.toggle();
    keepFocus();
  };

  const toggleLocation = async () => {
    await location.toggle();
    keepFocus();
  };

  return (
    <Layout.Screen>
      <DateTimeBadges
        when={when}
        onOpenDate={isReadOnly ? undefined : () => setDatePickerOpen(true)}
        onOpenTime={isReadOnly ? undefined : () => setTimePickerOpen(true)}
        location={location.place}
        locationOn={location.on}
        locationLoading={location.loading}
        locationFailed={location.failed}
        onLocationPress={isReadOnly ? undefined : toggleLocation}
        readOnly={isReadOnly}
      />

      <Layout.Screen.Body>
        <Layout.Screen.Main>
          <ComposeEditor
            inputRef={inputRef}
            value={text}
            onChangeText={setText}
            readOnly={isReadOnly}
          >
            {isReadOnly ? (
              <ComposeAttachments
                imageUris={imageUris}
                onRemoveImage={removeImage}
                audioUri={hasAudioDraft ? audioUri : undefined}
                audioDurationMs={audioDurationMs}
                audioLevels={recording.recordedLevels}
                onRemoveAudio={recording.clear}
                readOnly
              />
            ) : null}
          </ComposeEditor>
        </Layout.Screen.Main>

        {!isReadOnly ? (
          <Layout.Screen.Footer>
            <ComposeAttachments
              imageUris={imageUris}
              onRemoveImage={removeImage}
              audioUri={hasAudioDraft ? audioUri : undefined}
              audioDurationMs={audioDurationMs}
              audioLevels={recording.recordedLevels}
              onRemoveAudio={recording.clear}
              readOnly={false}
            />
            <ComposeFooterBar
              imageCount={imageUris.length}
              isRecording={isRecording}
              canSave={canSave}
              recordingDurationMs={recording.durationMs}
              recordingLevels={recording.liveLevels}
              onPickImage={pickImage}
              onToggleRecording={toggleRecording}
              onSave={handleSave}
            />
          </Layout.Screen.Footer>
        ) : null}
      </Layout.Screen.Body>

      <CalendarPicker
        visible={datePickerOpen}
        selectedDate={when}
        onSelectDate={(dayTs) => setWhen((prev) => withTimeOfDay(dayTs, prev))}
        onClose={() => setDatePickerOpen(false)}
      />

      <TimePicker
        visible={timePickerOpen}
        value={when}
        onChange={(ts) => setWhen(ts)}
        onClose={() => setTimePickerOpen(false)}
      />

      {existing ? (
        <EntryDetailsModal
          entry={existing}
          visible={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          onEdit={() => setMode("edit")}
          onDelete={async () => {
            await removeEntry(existing.id);
            navigation.goBack();
          }}
        />
      ) : null}
    </Layout.Screen>
  );
}
