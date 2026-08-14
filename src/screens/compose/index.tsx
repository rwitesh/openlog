import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, type TextInput } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import type { RootStackParamList } from "@/types/navigation";
import type { Entry } from "@/types/entry";
import { useEntries } from "@/entries";
import { canSaveDraft, fromDraft, logDevWarning, useRecording } from "@/lib";
import { withTimeOfDay } from "@/lib/dates";
import { Layout, useKeepFocus } from "@/layout";
import { CalendarPicker, TimePicker } from "@/components/core";
import { useLocation } from "@/hooks";

import { Attachments, MAX_IMAGES } from "./Attachments";
import { DateTimeBadges } from "./DateTimeBadges";
import { Editor } from "./Editor";
import { FooterBar } from "./FooterBar";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

function entryText(entry: Entry): string {
  if (entry.type === "text") return entry.text;
  return entry.text?.trim() ?? "";
}

function entryImages(entry: Entry): string[] {
  return entry.type === "image" ? entry.uris : [];
}

export function Compose({ navigation, route }: Props) {
  const entryId = route.params?.entryId;
  const { entries, addEntry, patchEntry } = useEntries();
  const existing = entryId ? entries.find((entry) => entry.id === entryId) : undefined;
  const isEditing = Boolean(existing);

  const [text, setText] = useState(() => (existing ? entryText(existing) : ""));
  const [imageUris, setImageUris] = useState<string[]>(() =>
    existing ? entryImages(existing) : []
  );
  const [saving, setSaving] = useState(false);
  const [when, setWhen] = useState(() => existing?.createdAt ?? Date.now());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const recording = useRecording();
  const keepFocus = useKeepFocus(inputRef);
  const location = useLocation(text, existing?.location);

  useEffect(() => {
    if (!entryId) return;
    if (existing) return;
    navigation.goBack();
  }, [entryId, existing, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? "Edit entry" : "New entry" });
  }, [navigation, isEditing]);

  const audioUri = isEditing && existing?.type === "audio" ? existing.uri : recording.recordedUri;
  const audioDurationMs =
    isEditing && existing?.type === "audio"
      ? existing.durationMs ?? 0
      : recording.recordedDurationMs;
  const isRecording = recording.isRecording;
  const hasAudioDraft = Boolean(audioUri && !isRecording);
  const canSave =
    canSaveDraft({ text, imageUris, audioUri }) && !isRecording && !saving;

  const pickImage = async () => {
    if (isEditing || imageUris.length >= MAX_IMAGES) return;

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
    if (isEditing) return;
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      if (isEditing && existing) {
        await patchEntry(existing.id, {
          text: text.trim(),
          createdAt: when,
          location:
            location.on && location.place ? location.place : null,
        });
        navigation.goBack();
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
    if (isEditing) return;
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
        onOpenDate={() => setDatePickerOpen(true)}
        onOpenTime={() => setTimePickerOpen(true)}
        location={location.place}
        locationOn={location.on}
        locationLoading={location.loading}
        locationFailed={location.failed}
        onLocationPress={toggleLocation}
      />

      <Layout.Screen.Body>
        <Layout.Screen.Main>
          <Editor
            inputRef={inputRef}
            value={text}
            onChangeText={setText}
          />
        </Layout.Screen.Main>

        <Layout.Screen.Footer>
          <Attachments
            imageUris={imageUris}
            onRemoveImage={removeImage}
            audioUri={hasAudioDraft ? audioUri : undefined}
            audioDurationMs={audioDurationMs ?? 0}
            audioLevels={isEditing ? undefined : recording.recordedLevels}
            onRemoveAudio={recording.clear}
            readOnly={isEditing}
          />

          <FooterBar
            imageCount={imageUris.length}
            isRecording={isRecording}
            canSave={canSave}
            recordingDurationMs={recording.durationMs}
            recordingLevels={recording.liveLevels}
            onPickImage={pickImage}
            onToggleRecording={toggleRecording}
            onSave={handleSave}
            showMediaTools={!isEditing}
          />
        </Layout.Screen.Footer>
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
    </Layout.Screen>
  );
}
