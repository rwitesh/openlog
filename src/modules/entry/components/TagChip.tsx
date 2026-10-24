import { Feather } from "@expo/vector-icons";
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { ThemedText } from "@/shared/components";
import type { Tag } from "@/shared/types";
import { metrics, press, radius, space, useTheme } from "@/theme";
import { tagColors } from "../utils/TagColors";

interface TagChipProps {
  tag: Tag;
  /** Opens the tag; the chip becomes a button. */
  onPress?: () => void;
  onRemove?: () => void;
  /** Entries carrying the tag, shown quietly after the name when browsing tags. */
  count?: number;
  size?: "regular" | "compact";
}

export function TagChip({ tag, onPress, onRemove, count, size = "regular" }: TagChipProps) {
  const { isDark } = useTheme();
  const colors = tagColors(tag.colorId, isDark);
  const compact = size === "compact";

  const content = (
    <>
      <View
        style={[styles.dot, compact && styles.dotCompact, { backgroundColor: colors.foreground }]}
      />
      <ThemedText
        weight="medium"
        style={[styles.name, compact && styles.nameCompact, { color: colors.foreground }]}
      >
        {tag.name}
      </ThemedText>
      {count !== undefined ? (
        <ThemedText
          style={[
            styles.name,
            compact && styles.nameCompact,
            styles.count,
            { color: colors.foreground },
          ]}
        >
          {count}
        </ThemedText>
      ) : null}
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          // Slop instead of padding keeps the chip as tall as its text, so edit mode doesn't shift rows.
          hitSlop={space.md}
          style={({ pressed }) => pressed && press}
          accessibilityLabel={`Remove ${tag.name} tag`}
          accessibilityRole="button"
        >
          <Feather name="x" size={metrics.iconXs} color={colors.foreground} />
        </Pressable>
      ) : null}
    </>
  );
  const chipStyle = [
    styles.chip,
    compact && styles.chipCompact,
    { backgroundColor: colors.background },
  ];

  // A plain View keeps a non-interactive chip from capturing taps meant for its row.
  if (!onPress) return <View style={chipStyle}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      // Vertical only: horizontal slop would reach into the neighbouring chip across the gap.
      hitSlop={compact ? { top: space.sm, bottom: space.sm } : 0}
      style={({ pressed }) => [chipStyle, pressed && press]}
      accessibilityRole="button"
      accessibilityLabel={
        count === undefined
          ? `Show entries tagged ${tag.name}`
          : `Show ${count} ${count === 1 ? "entry" : "entries"} tagged ${tag.name}`
      }
    >
      {content}
    </Pressable>
  );
}

interface TagChipListProps {
  tags: Tag[];
  /** Shows at most this many chips, then a quiet "+N" that opens the full list. */
  max: number;
  size?: "regular" | "compact";
  onPressTag: (tag: Tag) => void;
  onPressMore: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Wrapped tag chips for an entry; long lists stay brief so tags never outweigh the content. */
export function TagChipList({
  tags,
  max,
  size = "regular",
  onPressTag,
  onPressMore,
  style,
}: TagChipListProps) {
  const { colors } = useTheme();
  if (!tags.length) return null;
  const hidden = Math.max(0, tags.length - max);

  return (
    <View style={[styles.list, style]}>
      {tags.slice(0, max).map((tag) => (
        <TagChip key={tag.id} tag={tag} size={size} onPress={() => onPressTag(tag)} />
      ))}
      {hidden ? (
        <Pressable
          onPress={onPressMore}
          hitSlop={space.sm}
          style={({ pressed }) => pressed && press}
          accessibilityRole="button"
          accessibilityLabel={`${hidden} more ${hidden === 1 ? "tag" : "tags"}`}
          accessibilityHint="Shows all tags."
        >
          <ThemedText
            style={[
              size === "compact" ? styles.nameCompact : styles.name,
              { color: colors.textTertiary },
            ]}
          >
            {`+${hidden}`}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.xs + 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 1,
  },
  chipCompact: { gap: space.xs, paddingHorizontal: space.xs + 2, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotCompact: { width: 4, height: 4, borderRadius: 2 },
  name: { fontSize: 13, lineHeight: 18 },
  nameCompact: { fontSize: 12, lineHeight: 16 },
  count: { opacity: 0.7, fontVariant: ["tabular-nums"] },
});
