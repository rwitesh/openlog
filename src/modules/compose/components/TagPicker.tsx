import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { TagColorSwatches, TagEditor } from "@/modules/entry/components/TagEditor";
import { tagColors } from "@/modules/entry/utils/TagColors";
import { createTag, getTags, MAX_TAG_NAME_LENGTH, MAX_TAGS_PER_ENTRY } from "@/services/db/tags";
import { Sheet, ThemedText } from "@/shared/components";
import { TAG_COLOR_IDS, type Tag, type TagColorId } from "@/shared/types";
import { reportError } from "@/shared/utils/devLog";
import { fontFamily, metrics, press, radius, space, useTheme } from "@/theme";

interface TagPickerProps {
  visible: boolean;
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  onClose: () => void;
}

export function TagPicker({ visible, selected, onChange, onClose }: TagPickerProps) {
  const { isDark, theme } = useTheme();
  const { colors } = theme;
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [colorId, setColorId] = useState<TagColorId>(TAG_COLOR_IDS[0]);
  const [editing, setEditing] = useState<Tag | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setColorId(TAG_COLOR_IDS[0]);
    setEditing(null);
    getTags()
      .then(setTags)
      .catch((error) => {
        reportError("tags:load", error);
        Alert.alert("Couldn't load tags", "Try again.");
      });
  }, [visible]);

  const normalized = query.normalize("NFKC").trim().replace(/\s+/g, " ");
  const selectedIds = new Set(selected.map((tag) => tag.id));
  const matches = useMemo(
    () =>
      tags.filter((tag) => tag.name.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())),
    [tags, normalized]
  );
  const existingMatch = tags.some(
    (tag) => tag.name.toLocaleLowerCase() === normalized.toLocaleLowerCase()
  );
  const canCreate =
    Boolean(normalized) &&
    [...normalized].length <= MAX_TAG_NAME_LENGTH &&
    !existingMatch &&
    selected.length < MAX_TAGS_PER_ENTRY;

  const toggleTag = (tag: Tag) => {
    if (selectedIds.has(tag.id)) {
      onChange(selected.filter((item) => item.id !== tag.id));
      return;
    }
    if (selected.length >= MAX_TAGS_PER_ENTRY) {
      Alert.alert("Tag limit", `An entry can have up to ${MAX_TAGS_PER_ENTRY} tags.`);
      return;
    }
    onChange([...selected, tag]);
  };

  const handleCreate = async () => {
    if (selected.length >= MAX_TAGS_PER_ENTRY) {
      Alert.alert("Tag limit", `An entry can have up to ${MAX_TAGS_PER_ENTRY} tags.`);
      return;
    }
    try {
      const tag = await createTag({ name: normalized, colorId });
      setTags((current) =>
        [...current.filter((item) => item.id !== tag.id), tag].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setQuery("");
      if (!selectedIds.has(tag.id)) toggleTag(tag);
    } catch (error) {
      reportError("tags:create", error);
      Alert.alert("Couldn't create tag", "Try again.");
    }
  };

  const handleSaved = (updated: Tag) => {
    setTags((current) =>
      current
        .map((tag) => (tag.id === updated.id ? updated : tag))
        .sort((x, y) => x.name.localeCompare(y.name))
    );
    onChange(selected.map((tag) => (tag.id === updated.id ? updated : tag)));
    setEditing(null);
  };

  const handleDeleted = (tagId: string) => {
    setTags((current) => current.filter((tag) => tag.id !== tagId));
    onChange(selected.filter((tag) => tag.id !== tagId));
    setEditing(null);
  };

  const close = () => {
    setQuery("");
    setColorId(TAG_COLOR_IDS[0]);
    setEditing(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} keyboardBehavior="dock" sheetStyle={styles.sheet}>
      <View style={styles.header}>
        <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
          {editing ? "Edit tag" : "Tags"}
        </ThemedText>
        <Pressable
          onPress={close}
          hitSlop={space.sm}
          accessibilityLabel="Done selecting tags"
          accessibilityRole="button"
        >
          <ThemedText weight="medium" style={{ color: colors.accent }}>
            Done
          </ThemedText>
        </Pressable>
      </View>
      {editing ? (
        <TagEditor
          key={editing.id}
          tag={editing}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <View style={[styles.search, { backgroundColor: colors.surfaceMuted }]}>
          <Feather name="search" size={metrics.iconSm} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find or create a tag"
            placeholderTextColor={colors.textSecondary}
            maxLength={MAX_TAG_NAME_LENGTH}
            style={[
              styles.input,
              { color: colors.text, fontFamily: fontFamily("regular", theme.fontFamily) },
            ]}
            accessibilityLabel="Find or create a tag"
            accessibilityHint={`Search existing tags or create one with up to ${MAX_TAG_NAME_LENGTH} characters.`}
          />
        </View>
      )}
      {!editing && canCreate ? (
        <View style={styles.createArea}>
          <TagColorSwatches value={colorId} onChange={setColorId} />
          <Pressable
            onPress={() => void handleCreate()}
            style={({ pressed }) => [
              styles.create,
              { backgroundColor: colors.surfaceMuted },
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Create ${normalized} tag`}
          >
            <Feather name="plus" size={metrics.iconSm} color={colors.accent} />
            <ThemedText
              weight="medium"
              style={{ color: colors.accent }}
            >{`Create “${normalized}”`}</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {!editing ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {matches.map((tag) => {
            const color = tagColors(tag.colorId, isDark);
            const attached = selectedIds.has(tag.id);
            return (
              <View key={tag.id} style={styles.row}>
                <Pressable
                  onPress={() => toggleTag(tag)}
                  style={({ pressed }) => [styles.attachRow, pressed && press]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: attached }}
                  accessibilityLabel={`${attached ? "Remove" : "Attach"} ${tag.name} tag`}
                >
                  <Feather
                    name={attached ? "check-square" : "square"}
                    size={metrics.iconSm + 2}
                    color={attached ? colors.accent : colors.textTertiary}
                  />
                  <View style={[styles.dot, { backgroundColor: color.foreground }]} />
                  <ThemedText style={[styles.rowName, { color: colors.text }]}>
                    {tag.name}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setEditing(tag)}
                  style={({ pressed }) => [styles.editButton, pressed && press]}
                  accessibilityLabel={`Edit ${tag.name} tag`}
                  accessibilityRole="button"
                >
                  <Feather name="more-vertical" size={metrics.iconSm} color={colors.textTertiary} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: "78%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  title: { fontSize: 17, lineHeight: 24 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, paddingVertical: space.sm, fontSize: 15 },
  createArea: { marginTop: space.sm, gap: space.sm },
  create: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  list: { flexShrink: 1, paddingTop: space.sm, paddingBottom: space.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: space.xs,
    gap: space.sm,
  },
  attachRow: {
    flex: 1,
    minHeight: metrics.btnLg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  rowName: { flex: 1, fontSize: 15 },
  editButton: {
    width: metrics.btnLg,
    height: metrics.btnLg,
    alignItems: "center",
    justifyContent: "center",
  },
});
