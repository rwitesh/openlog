import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import {
  deleteTag,
  MAX_TAG_NAME_LENGTH,
  normalizeTagName,
  TagNameTakenError,
  updateTag,
} from "@/services/db/tags";
import { ThemedText } from "@/shared/components";
import { TAG_COLOR_IDS, type Tag, type TagColorId } from "@/shared/types";
import { reportError } from "@/shared/utils/devLog";
import { fontFamily, metrics, press, radius, space, useTheme } from "@/theme";
import { notifyStoreReload } from "../store/EntryStore";
import { tagColors } from "../utils/TagColors";

interface TagColorSwatchesProps {
  value: TagColorId;
  onChange: (colorId: TagColorId) => void;
}

export function TagColorSwatches({ value, onChange }: TagColorSwatchesProps) {
  const { isDark, theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.swatches}
      accessibilityRole="radiogroup"
      accessibilityLabel="Tag color"
    >
      {TAG_COLOR_IDS.map((id) => (
        <Pressable
          key={id}
          onPress={() => onChange(id)}
          style={styles.swatchButton}
          accessibilityLabel={`Use ${id} tag color`}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === id }}
        >
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: tagColors(id, isDark).foreground,
                borderColor: value === id ? theme.colors.text : "transparent",
              },
            ]}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

interface TagEditorProps {
  tag: Tag;
  onSaved: (tag: Tag) => void;
  onDeleted: (tagId: string) => void;
  onCancel: () => void;
}

/**
 * Rename, recolor, or delete one tag. Changes apply to every entry carrying it,
 * so open timelines reload after each write.
 */
export function TagEditor({ tag, onSaved, onDeleted, onCancel }: TagEditorProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [name, setName] = useState(tag.name);
  const [colorId, setColorId] = useState<TagColorId>(tag.colorId);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const normalized = normalizeTagName(name);
    if (!normalized) {
      Alert.alert("Couldn't update tag", `Use 1 to ${MAX_TAG_NAME_LENGTH} characters.`);
      return;
    }
    // Unchanged tags skip the write, which would otherwise reload every open timeline.
    if (normalized.name === tag.name && colorId === tag.colorId) {
      onSaved(tag);
      return;
    }
    setBusy(true);
    try {
      const updated = await updateTag(tag.id, { name, colorId });
      notifyStoreReload();
      onSaved(updated);
    } catch (error) {
      if (error instanceof TagNameTakenError) {
        Alert.alert("Couldn't update tag", error.message);
      } else {
        reportError("tags:update", error);
        Alert.alert("Couldn't update tag", "Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(`Delete “${tag.name}”?`, "It will be removed from every entry.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          deleteTag(tag.id)
            .then(() => {
              notifyStoreReload();
              onDeleted(tag.id);
            })
            .catch((error) => {
              reportError("tags:delete", error);
              Alert.alert("Couldn't delete tag", "Try again.");
            })
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  return (
    <View style={styles.editor}>
      <View style={[styles.field, { backgroundColor: colors.surfaceMuted }]}>
        <Feather name="tag" size={metrics.iconSm} color={colors.textSecondary} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Tag name"
          placeholderTextColor={colors.textSecondary}
          maxLength={MAX_TAG_NAME_LENGTH}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
          style={[
            styles.input,
            { color: colors.text, fontFamily: fontFamily("regular", theme.fontFamily) },
          ]}
          accessibilityLabel="Tag name"
          accessibilityHint={`Use up to ${MAX_TAG_NAME_LENGTH} characters.`}
        />
      </View>
      <TagColorSwatches value={colorId} onChange={setColorId} />
      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          disabled={busy}
          style={({ pressed }) => [styles.action, pressed && press]}
          accessibilityRole="button"
        >
          <ThemedText weight="medium" style={{ color: colors.textSecondary }}>
            Cancel
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          disabled={busy}
          style={({ pressed }) => [styles.action, pressed && press]}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${tag.name} tag`}
        >
          <ThemedText weight="medium" style={{ color: colors.destructive }}>
            Delete
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => void save()}
          disabled={busy}
          style={({ pressed }) => [styles.action, pressed && press]}
          accessibilityRole="button"
        >
          <ThemedText weight="medium" style={{ color: colors.accent }}>
            Save
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: space.sm },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: metrics.btnLg,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, paddingVertical: space.sm, fontSize: 15 },
  swatches: { gap: space.sm, paddingVertical: 2 },
  swatchButton: {
    width: metrics.btnLg,
    height: metrics.btnLg,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  action: {
    minHeight: metrics.btnLg,
    justifyContent: "center",
    paddingHorizontal: space.xs,
  },
});
