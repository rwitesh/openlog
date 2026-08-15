import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";

export interface SegmentItem<T> {
  id: T;
  label: string;
}

interface SegmentedRowProps<T extends string> {
  items: SegmentItem<T>[];
  selected: T;
  onSelect: (val: T) => void;
}

export function SegmentedRow<T extends string>({
  items,
  selected,
  onSelect,
}: SegmentedRowProps<T>) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.segmentTrack, { backgroundColor: colors.surfaceMuted }]}>
      {items.map((item) => {
        const isSelected = item.id === selected;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.segmentItem,
              isSelected && [
                styles.segmentItemSelected,
                { backgroundColor: colors.surface },
              ],
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <ThemedText
              weight={isSelected ? "medium" : "regular"}
              style={[
                styles.segmentLabel,
                { color: isSelected ? colors.text : colors.textSecondary },
              ]}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  segmentItemSelected: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
});
