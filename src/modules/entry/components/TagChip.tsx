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
          hitSlop={space.sm}
          style={({ pressed }) => [styles.remove, pressed && press]}
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
      hitSlop={compact ? space.sm : 0}
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
  /** Shows at most this many chips, then a quiet "+N" that leads to the full list. */
  max?: number;
  size?: "regular" | "compact";
  onPressTag?: (tag: Tag) => void;
  onPressMore?: () => void;
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
  const shown = max === undefined ? tags : tags.slice(0, max);
  const hidden = tags.length - shown.length;
  if (!tags.length) return null;
  const moreLabel = `${hidden} more ${hidden === 1 ? "tag" : "tags"}`;
  const moreText = (
    <ThemedText
      style={[
        size === "compact" ? styles.nameCompact : styles.name,
        { color: colors.textTertiary },
      ]}
    >
      {`+${hidden}`}
    </ThemedText>
  );

  return (
    <View style={[styles.list, style]}>
      {shown.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          size={size}
          onPress={onPressTag ? () => onPressTag(tag) : undefined}
        />
      ))}
      {hidden > 0 && onPressMore ? (
        <Pressable
          onPress={onPressMore}
          hitSlop={space.sm}
          style={({ pressed }) => pressed && press}
          accessibilityRole="button"
          accessibilityLabel={moreLabel}
          accessibilityHint="Shows all tags."
        >
          {moreText}
        </Pressable>
      ) : hidden > 0 ? (
        <View accessible accessibilityLabel={moreLabel}>
          {moreText}
        </View>
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
  remove: { marginRight: -space.xs, padding: space.xs },
});
