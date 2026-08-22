import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, type TextInput, View } from "react-native";
import {
  ComposeAttachments,
  ComposeEditor,
  ComposeFooterBar,
  DateTimeBadges,
  useComposeDraft,
  useMediaAttachments,
} from "@/modules/compose";
import { EntryDetailsModal, useEntries, useEntry } from "@/modules/entry";
import type { RootStackParamList } from "@/navigation/types";
import { ScreenHeader, ThemedBackground } from "@/shared/components";
import { Layout, useKeepFocus } from "@/shared/components/Layout";
import { CalendarPicker, TimePicker } from "@/shared/pickers";
import { withTimeOfDay } from "@/shared/utils/dates";
import { metrics, press, space, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

export function ComposeScreen({ navigation, route }: Props) {
  const { colors } = useTheme().theme;
  const entryId = route.params?.entryId;
  const [mode, setMode] = useState<"view" | "edit">(
    route.params?.mode ?? (entryId ? "view" : "edit")
  );
  const isReadOnly = Boolean(entryId && mode === "view");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { removeEntry } = useEntries();
  const entry = useEntry(entryId);
  const existing = entry ?? undefined;

  const inputRef = useRef<TextInput>(null);
  const keepFocus = useKeepFocus(inputRef);

  const media = useMediaAttachments(existing);
  const draft = useComposeDraft(existing, media);
  const { location } = draft;

  // Editing an entry that no longer exists — leave.
  useEffect(() => {
    if (!entryId) return;
    if (entry === null) {
      // Entry was checked and doesn't exist
      const timer = setTimeout(() => {
        navigation.goBack();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [entryId, entry, navigation]);

  const title = isReadOnly ? "Entry" : existing ? "Edit entry" : "New entry";

  const headerRight = isReadOnly ? (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => setMode("edit")}
        hitSlop={space.md}
        style={({ pressed }) => pressed && press}
        accessibilityRole="button"
        accessibilityLabel="Edit"
      >
        <Feather name="edit-2" size={metrics.iconMd} color={colors.text} />
      </Pressable>
      <Pressable
        onPress={() => setDetailsOpen(true)}
        hitSlop={space.md}
        style={({ pressed }) => pressed && press}
        accessibilityRole="button"
        accessibilityLabel="Entry details"
      >
        <Feather name="more-vertical" size={metrics.iconMd} color={colors.textSecondary} />
      </Pressable>
    </View>
  ) : existing ? (
    <Pressable
      onPress={() => {
        draft.reset();
        media.reset();
        setMode("view");
      }}
      hitSlop={space.md}
      style={({ pressed }) => pressed && press}
      accessibilityRole="button"
      accessibilityLabel="Cancel"
    >
      <Feather name="x" size={metrics.iconLg} color={colors.textSecondary} />
    </Pressable>
  ) : undefined;

  const handleSave = async () => {
    const outcome = await draft.save();
    if (outcome === "created") navigation.goBack();
    else if (outcome === "updated") setMode("view");
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
    <Layout.Screen style={[styles.screen, { backgroundColor: colors.background }]}>
      <ThemedBackground />

      <ScreenHeader title={title} onBack={() => navigation.goBack()} right={headerRight} />

      <DateTimeBadges
        when={draft.when}
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
            value={draft.text}
            onChangeText={draft.setText}
            readOnly={isReadOnly}
          >
            {isReadOnly ? (
              <ComposeAttachments
                imageUris={media.images}
                onRemoveImage={media.removeImage}
                audioUris={media.audios}
                onRemoveAudio={media.removeAudio}
                readOnly
              />
            ) : null}
          </ComposeEditor>
        </Layout.Screen.Main>

        {!isReadOnly ? (
          <Layout.Screen.Footer>
            <ComposeAttachments
              imageUris={media.images}
              onRemoveImage={media.removeImage}
              audioUris={media.audios}
              onRemoveAudio={media.removeAudio}
              readOnly={false}
            />
            <ComposeFooterBar
              imageCount={media.images.length}
              isRecording={media.isRecording}
              canSave={draft.canSave}
              recordingDurationMs={media.recordingDurationMs}
              recordingLevels={media.recordingLevels}
              onPickImage={async () => {
                await media.pickImage();
                keepFocus();
              }}
              onToggleRecording={async () => {
                await media.toggleRecording();
                keepFocus();
              }}
              onSave={handleSave}
            />
          </Layout.Screen.Footer>
        ) : null}
      </Layout.Screen.Body>

      <CalendarPicker
        visible={datePickerOpen}
        selectedDate={draft.when}
        onSelectDate={(dayTs) => draft.setWhen((prev) => withTimeOfDay(dayTs, prev))}
        onClose={() => setDatePickerOpen(false)}
      />

      <TimePicker
        visible={timePickerOpen}
        value={draft.when}
        onChange={draft.setWhen}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
});
