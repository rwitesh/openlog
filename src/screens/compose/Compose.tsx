import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Pressable, View, type TextInput } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";

import type { RootStackParamList } from "@/navigation/types";
import { EntryDetailsModal, useEntries } from "@/features/entry";
import {
  ComposeAttachments,
  ComposeEditor,
  ComposeFooterBar,
  DateTimeBadges,
  MAX_IMAGES,
} from "@/features/compose";
import { useRecording } from "@/services/audio";
import { useLocation } from "@/services/location";
import { persistMedia } from "@/services/media";
import { withTimeOfDay } from "@/shared/utils/dates";
import { logDevWarning } from "@/shared/utils/devLog";
import { Layout, useKeepFocus } from "@/shared/components/Layout";
import { CalendarPicker, TimePicker } from "@/shared/pickers";
import { useTheme } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

export function ComposeScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;

  const entryId = route.params?.entryId;
  const [mode, setMode] = useState<"view" | "edit">(route.params?.mode ?? (entryId ? "view" : "edit"));
  const isReadOnly = Boolean(entryId && mode === "view");

  const { entries, addEntry, patchEntry, removeEntry } = useEntries();
  const existing = entryId ? entries.find((entry) => entry.id === entryId) : undefined;

  const [text, setText] = useState(() => existing?.text ?? "");
  const [images, setImages] = useState<string[]>(() => existing?.images ?? []);
  const [audios, setAudios] = useState<string[]>(() => existing?.audios ?? []);
  const [saving, setSaving] = useState(false);
  const [when, setWhen] = useState(() => existing?.createdAt ?? Date.now());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const recording = useRecording();
  const keepFocus = useKeepFocus(inputRef);
  const location = useLocation(existing?.location);

  // If a new recording completes, append it to audios list
  useEffect(() => {
    if (recording.recordedUri && !recording.isRecording) {
      setAudios((prev) => [...prev, recording.recordedUri!]);
      recording.clear();
    }
  }, [recording.recordedUri, recording.isRecording, recording]);

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
              setText(existing.text ?? "");
              setImages(existing.images);
              setAudios(existing.audios);
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

  const isRecording = recording.isRecording;
  const canSave =
    Boolean(text.trim() || images.length || audios.length || recording.recordedUri) &&
    !isRecording &&
    !saving;

  const pickImage = async () => {
    if (isReadOnly || images.length >= MAX_IMAGES) return;

    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;

    const remaining = MAX_IMAGES - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setImages((prev) => [
        ...prev,
        ...result.assets.map((asset) => asset.uri),
      ]);
      keepFocus();
    }
  };

  const removeImage = (index: number) => {
    if (isReadOnly) return;
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAudio = (index: number) => {
    if (isReadOnly) return;
    setAudios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      // Gather active audio URIs including in-progress recording if any
      const pendingAudios = [...audios];
      if (recording.recordedUri && !pendingAudios.includes(recording.recordedUri)) {
        pendingAudios.push(recording.recordedUri);
      }

      // Persist all media files into app storage
      const persistedImages = await Promise.all(
        images.map((img) => persistMedia(img, "jpg"))
      );
      const persistedAudios = await Promise.all(
        pendingAudios.map((aud) => persistMedia(aud, "m4a"))
      );

      const entryPayload = {
        text: text.trim() || undefined,
        images: persistedImages,
        audios: persistedAudios,
        createdAt: when,
        location: location.on && location.place ? location.place : null,
      };

      if (existing) {
        await patchEntry(existing.id, entryPayload);
        setMode("view");
        return;
      }

      await addEntry(entryPayload);
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

  const handleLocationPress = async () => {
    await location.request();
    keepFocus();
  };

  const handleLocationRefresh = async () => {
    await location.refresh();
    keepFocus();
  };

  const handleLocationRemove = () => {
    location.remove();
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
        onLocationPress={isReadOnly ? undefined : handleLocationPress}
        onLocationRefresh={isReadOnly ? undefined : handleLocationRefresh}
        onLocationRemove={isReadOnly ? undefined : handleLocationRemove}
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
                imageUris={images}
                onRemoveImage={removeImage}
                audioUris={audios}
                onRemoveAudio={removeAudio}
                readOnly
              />
            ) : null}
          </ComposeEditor>
        </Layout.Screen.Main>

        {!isReadOnly ? (
          <Layout.Screen.Footer>
            <ComposeAttachments
              imageUris={images}
              onRemoveImage={removeImage}
              audioUris={audios}
              onRemoveAudio={removeAudio}
              readOnly={false}
            />
            <ComposeFooterBar
              imageCount={images.length}
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
