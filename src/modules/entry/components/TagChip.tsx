import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/shared/components";
import type { Tag } from "@/shared/types";
import { metrics, press, radius, space, useTheme } from "@/theme";
import { tagColors } from "../utils/TagColors";

interface TagChipProps {
  tag: Tag;
  onRemove?: () => void;
}

export function TagChip({ tag, onRemove }: TagChipProps) {
  const { isDark } = useTheme();
  const colors = tagColors(tag.colorId, isDark);

  return (
    <View style={[styles.chip, { backgroundColor: colors.background }]}>
      <View style={[styles.dot, { backgroundColor: colors.foreground }]} />
      <ThemedText weight="medium" style={[styles.name, { color: colors.foreground }]}>
        {tag.name}
      </ThemedText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  name: { fontSize: 13, lineHeight: 18 },
  remove: { marginRight: -space.xs, padding: space.xs },
});
