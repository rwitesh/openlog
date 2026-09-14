import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, type TextInput, View } from "react-native";
import { analytics } from "@/config/analytics";
import {
  ComposeAttachments,
  ComposeEditor,
  ComposeFooterBar,
  DateTimeBadges,
  TagPicker,
  useComposeDraft,
  useMediaAttachments,
} from "@/modules/compose";
import { EntryDetailsModal, TagChip, useEntries, useEntry } from "@/modules/entry";
import type { RootStackParamList } from "@/navigation/types";
import { ScreenHeader, ThemedText } from "@/shared/components";
import { Layout, useKeepFocus } from "@/shared/components/Layout";
import { CalendarPicker, TimePicker } from "@/shared/pickers";
import type { Entry } from "@/shared/types";
import { withTimeOfDay } from "@/shared/utils/dates";
import { metrics, press, space, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

export function ComposeScreen({ navigation, route }: Props) {
  const { colors } = useTheme().theme;
  const entryId = route.params?.entryId;
  const entry = useEntry(entryId);

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

  if (entryId && entry === undefined) {
    return (
      <Layout.Screen style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Entry" onBack={() => navigation.goBack()} />
      </Layout.Screen>
    );
  }

  if (entryId && entry === null) {
    return (
      <Layout.Screen style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Entry" onBack={() => navigation.goBack()} />
      </Layout.Screen>
    );
  }

  const composeKey =
    entry?.id ??
    (route.params?.initialDate !== undefined ? `new-${route.params.initialDate}` : "new");

  return (
    <ComposeContent
      key={composeKey}
      navigation={navigation}
      route={route}
      existing={entry ?? undefined}
    />
  );
}

interface ComposeContentProps {
  navigation: Props["navigation"];
  route: Props["route"];
  existing?: Entry;
}

function ComposeContent({ navigation, route, existing }: ComposeContentProps) {
  const { colors } = useTheme().theme;
  const entryId = existing?.id;
  const [mode, setMode] = useState<"view" | "edit">(
    route.params?.mode ?? (entryId ? "view" : "edit")
  );
  const isReadOnly = Boolean(entryId && mode === "view");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  const { removeEntry } = useEntries();

  const inputRef = useRef<TextInput>(null);
  const keepFocus = useKeepFocus(inputRef);

  const media = useMediaAttachments(existing);
  const draft = useComposeDraft(existing, media, route.params?.initialDate);
  const { location } = draft;

  // Pre-focus the writing surface when entering compose or switching to edit mode
  useEffect(() => {
    if (!isReadOnly) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isReadOnly]);

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
    const entryProperties = {
      has_text: draft.text.trim().length > 0,
      image_count: media.images.length,
      audio_count: media.audios.length,
      file_count: media.attachments.length,
      has_location: Boolean(location.on && location.place),
    };

    if (outcome === "created") {
      analytics.capture("entry_created", entryProperties);
      navigation.goBack();
    } else if (outcome === "updated") {
      analytics.capture("entry_updated", entryProperties);
      setMode("view");
    }
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

      <View style={styles.tags}>
        {draft.tags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            onRemove={
              isReadOnly
                ? undefined
                : () => draft.setTags((tags) => tags.filter((item) => item.id !== tag.id))
            }
          />
        ))}
        {!isReadOnly ? (
          <Pressable
            onPress={() => setTagsOpen(true)}
            hitSlop={space.xs}
            style={({ pressed }) => [
              styles.addTag,
              { borderColor: colors.separator },
              pressed && press,
            ]}
            accessibilityLabel="Add tags"
            accessibilityRole="button"
          >
            <Feather name="tag" size={metrics.iconXs} color={colors.textSecondary} />
            <ThemedText
              weight="medium"
              style={[styles.addTagText, { color: colors.textSecondary }]}
            >
              Tags
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

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
                attachments={media.attachments}
                onRemoveAttachment={media.removeAttachment}
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
              attachments={media.attachments}
              onRemoveAttachment={media.removeAttachment}
              readOnly={false}
            />
            <ComposeFooterBar
              imageCount={media.images.length}
              attachmentCount={media.attachments.length}
              isRecording={media.isRecording}
              canSave={draft.canSave}
              recordingDurationMs={media.recordingDurationMs}
              recordingLevels={media.recordingLevels}
              onPickImage={async () => {
                await media.pickImage();
                keepFocus();
              }}
              onPickAttachments={async () => {
                await media.pickAttachments();
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

      <TagPicker
        visible={tagsOpen}
        selected={draft.tags}
        onChange={draft.setTags}
        onClose={() => setTagsOpen(false)}
      />

      {existing ? (
        <EntryDetailsModal
          entry={existing}
          visible={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          onEdit={() => setMode("edit")}
          onDelete={async () => {
            await removeEntry(existing.id);
            analytics.capture("entry_deleted", {
              has_text: Boolean(existing.text?.trim()),
              image_count: existing.images.length,
              audio_count: existing.audios.length,
              file_count: existing.attachments.length,
              has_location: Boolean(existing.location),
            });
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
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.xs + 2,
    marginHorizontal: space.xxl,
    marginBottom: space.sm,
  },
  addTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 1,
  },
  addTagText: { fontSize: 13, lineHeight: 18 },
});
