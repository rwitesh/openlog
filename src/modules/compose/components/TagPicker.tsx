import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { TagColorSwatches, TagEditor } from "@/modules/entry";
import { tagColors } from "@/modules/entry/utils/TagColors";
import { createTag, getTags, MAX_TAG_NAME_LENGTH, MAX_TAGS_PER_ENTRY } from "@/services/db/tags";
import { Sheet, ThemedText, useKeyboardInset } from "@/shared/components";
import { TAG_COLOR_IDS, type Tag, type TagColorId } from "@/shared/types";
import { reportError } from "@/shared/utils/devLog";
import { fontFamily, metrics, press, radius, space, useTheme } from "@/theme";

/** The palette color fewest tags use (palette order breaks ties), so new tags spread across hues. */
function leastUsedColor(tags: Tag[]): TagColorId {
  const usage = new Map<TagColorId, number>(TAG_COLOR_IDS.map((id) => [id, 0]));
  for (const tag of tags) usage.set(tag.colorId, (usage.get(tag.colorId) ?? 0) + 1);
  return TAG_COLOR_IDS.reduce((best, id) =>
    (usage.get(id) ?? 0) < (usage.get(best) ?? 0) ? id : best
  );
}

/** Share of the screen the tag grid may fill before it scrolls; few tags keep the sheet short. */
const GRID_MAX_SHARE = 0.45;

interface PickerChipProps {
  tag: Tag;
  selected: boolean;
  /** At the per-entry limit: attaching is blocked, but long-press editing still works. */
  disabled: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

/** Selectable tag: outlined with a dot when free, tinted with a check when attached. */
function PickerChip({ tag, selected, disabled, onToggle, onEdit }: PickerChipProps) {
  const { isDark, colors } = useTheme();
  const tint = tagColors(tag.colorId, isDark);

  return (
    <Pressable
      onPress={() => {
        if (!disabled) onToggle();
      }}
      onLongPress={onEdit}
      hitSlop={space.xs}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: tint.background, borderColor: tint.background }
          : { borderColor: colors.line },
        disabled && styles.chipDisabled,
        pressed && !disabled && press,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={tag.name}
      accessibilityHint="Long press to edit."
      accessibilityActions={[{ name: "edit", label: "Edit tag" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "edit") onEdit();
      }}
    >
      {selected ? (
        <Feather name="check" size={metrics.iconXs} color={tint.foreground} />
      ) : (
        <View style={[styles.chipDot, { backgroundColor: tint.foreground }]} />
      )}
      <ThemedText
        weight={selected ? "medium" : "regular"}
        style={[styles.chipName, { color: selected ? tint.foreground : colors.textSecondary }]}
      >
        {tag.name}
      </ThemedText>
    </Pressable>
  );
}

interface TagPickerProps {
  visible: boolean;
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  onClose: () => void;
}

export function TagPicker({ visible, selected, onChange, onClose }: TagPickerProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const window = useWindowDimensions();
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  // A color picked for the tag being created; otherwise each new tag gets a fresh suggestion.
  const [pickedColorId, setPickedColorId] = useState<TagColorId | null>(null);
  const [editing, setEditing] = useState<Tag | null>(null);
  const keyboard = useKeyboardInset();
  // Height above the field while unfiltered, and the keyboard offset it was measured under;
  // filtering keeps it so the sheet never resizes under the field.
  const [bodyLock, setBodyLock] = useState<{ height: number; offset: number } | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setPickedColorId(null);
    setEditing(null);
    getTags()
      .then(setTags)
      .catch((error) => {
        reportError("tags:load", error);
        Alert.alert("Couldn't load tags", "Try again.");
      });
  }, [visible]);

  const colorId = pickedColorId ?? leastUsedColor(tags);
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
  const atLimit = selected.length >= MAX_TAGS_PER_ENTRY;
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
      setPickedColorId(null);
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
    setPickedColorId(null);
    setEditing(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} keyboardBehavior="dock">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
            {editing ? "Edit tag" : "Tags"}
          </ThemedText>
          {!editing && selected.length ? (
            <ThemedText style={[styles.limit, { color: colors.textTertiary }]}>
              {`${selected.length} of ${MAX_TAGS_PER_ENTRY}`}
            </ThemedText>
          ) : null}
        </View>
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
        <>
          <View
            style={[
              styles.body,
              // A lock measured under another keyboard state could overflow the docked sheet.
              normalized && bodyLock?.offset === keyboard.offset
                ? { minHeight: bodyLock.height }
                : null,
            ]}
            onLayout={(event) => {
              if (!normalized) {
                setBodyLock({ height: event.nativeEvent.layout.height, offset: keyboard.offset });
              }
            }}
          >
            {tags.length ? (
              <ScrollView
                style={[styles.grid, { maxHeight: window.height * GRID_MAX_SHARE }]}
                contentContainerStyle={styles.gridContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.gridRows}>
                  {matches.map((tag) => {
                    const attached = selectedIds.has(tag.id);
                    return (
                      <PickerChip
                        key={tag.id}
                        tag={tag}
                        selected={attached}
                        disabled={!attached && atLimit}
                        onToggle={() => toggleTag(tag)}
                        onEdit={() => setEditing(tag)}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
            {canCreate ? (
              <View style={styles.createArea}>
                <TagColorSwatches value={colorId} onChange={setPickedColorId} />
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
          </View>
          {/* Last in the sheet, so it rests on the keyboard and stays put while results change. */}
          <View style={[styles.search, { backgroundColor: colors.surfaceMuted }]}>
            <Feather name="search" size={metrics.iconSm} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Find or create a tag"
              placeholderTextColor={colors.textSecondary}
              maxLength={MAX_TAG_NAME_LENGTH}
              returnKeyType="done"
              submitBehavior={canCreate ? "submit" : "blurAndSubmit"}
              onSubmitEditing={() => {
                if (canCreate) void handleCreate();
              }}
              style={[
                styles.input,
                { color: colors.text, fontFamily: fontFamily("regular", theme.fontFamily) },
              ]}
              accessibilityLabel="Find or create a tag"
              accessibilityHint={`Search existing tags or create one with up to ${MAX_TAG_NAME_LENGTH} characters.`}
            />
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  title: { fontSize: 17, lineHeight: 24 },
  limit: { fontSize: 13, lineHeight: 18, fontVariant: ["tabular-nums"] },
  search: {
    marginBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, paddingVertical: space.sm, fontSize: 15 },
  createArea: { gap: space.sm, marginBottom: space.sm },
  create: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  body: { flexShrink: 1 },
  grid: { flexGrow: 1, flexShrink: 1 },
  // Rows settle at the bottom, next to the field, when filtering leaves room above them.
  gridContent: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: space.md },
  gridRows: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    minHeight: metrics.btnMd,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.md,
  },
  chipDisabled: { opacity: 0.4 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipName: { fontSize: 14, lineHeight: 20 },
});
