import { useRef, useState } from "react";
import { type TextInput } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/entries";
import { canSaveDraft, fromDraft, useRecording } from "@/lib";
import { withTimeOfDay } from "@/lib/dates";
import { Layout, useKeepFocus } from "@/layout";
import { CalendarPicker, TimePicker } from "@/components/core";
import { useLocation } from "@/hooks";

import { Attachments, MAX_IMAGES } from "./Attachments";
import { DateTimeBadges } from "./DateTimeBadges";
import { Editor } from "./Editor";
import { FooterBar } from "./FooterBar";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

export function Compose({ navigation }: Props) {
  const { addEntry } = useEntries();

  const [text, setText] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [when, setWhen] = useState(() => Date.now());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const recording = useRecording();
  const keepFocus = useKeepFocus(inputRef);
  const location = useLocation(text);

  const audioUri = recording.recordedUri;
  const isRecording = recording.isRecording;
  const hasAudioDraft = Boolean(audioUri && !isRecording);
  const canSave =
    canSaveDraft({ text, imageUris, audioUri }) && !isRecording && !saving;

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
      keepFocus();
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      const input = await fromDraft({
        text: text.trim() || undefined,
        imageUris: imageUris.length ? imageUris : undefined,
        audioUri,
        durationMs: recording.recordedDurationMs,
        createdAt: when,
        location:
          location.on && location.place ? location.place : undefined,
      });
      if (input) await addEntry(input);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const toggleRecording = async () => {
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
            audioDurationMs={recording.recordedDurationMs ?? 0}
            audioLevels={recording.recordedLevels}
            onRemoveAudio={recording.clear}
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
