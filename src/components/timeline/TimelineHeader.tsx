import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatHeaderDate } from "@/lib";
import { ThemedText } from "@/components/core";
import { DateStrip } from "./DateStrip";

interface TimelineHeaderProps {
  selectedDate: number;
  onSelectDate: (ts: number) => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onLayout: (height: number) => void;
}

export function TimelineHeader({
  selectedDate,
  onSelectDate,
  onOpenCalendar,
  onOpenSettings,
  onLayout,
}: TimelineHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <View
      onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
      style={[
        styles.header,
        {
          paddingTop: insets.top + space.sm,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onOpenCalendar}
          style={({ pressed }) => [styles.titleBtn, pressed && styles.pressed]}
          accessibilityLabel={formatHeaderDate(selectedDate)}
        >
          <ThemedText
            weight="semibold"
            style={[typography.headerDate, styles.title, { color: colors.text }]}
          >
            {formatHeaderDate(selectedDate)}
          </ThemedText>
          <Feather
            name="chevron-down"
            size={14}
            color={colors.textSecondary}
            style={styles.titleChevron}
          />
        </Pressable>

        <Pressable
          onPress={onOpenSettings}
          hitSlop={space.md}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Feather name="settings" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <DateStrip selectedDate={selectedDate} onSelectDate={onSelectDate} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: space.sm,
  },
  row: {
    height: metrics.headerRowHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
  },
  titleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  title: {
    textTransform: "capitalize",
  },
  titleChevron: {
    marginTop: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.5,
  },
});
