import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { formatMonthYear } from "@/lib";
import { ThemedText } from "@/components/core";

interface TimelineHeaderProps {
  viewMonth: number;
  onOpenMonthPicker: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onLayout: (height: number) => void;
}

export function TimelineHeader({
  viewMonth,
  onOpenMonthPicker,
  onOpenCalendar,
  onOpenSettings,
  onLayout,
}: TimelineHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const label = formatMonthYear(viewMonth);

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
          onPress={onOpenMonthPicker}
          style={({ pressed }) => [styles.titleBtn, pressed && press]}
          accessibilityLabel={`Month ${label}, pick another month`}
        >
          <ThemedText
            weight="semibold"
            style={[typography.headerDate, styles.title, { color: colors.text }]}
          >
            {label}
          </ThemedText>
          <Feather
            name="chevron-down"
            size={metrics.iconXs}
            color={colors.textSecondary}
            style={styles.titleChevron}
          />
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={onOpenCalendar}
            hitSlop={space.md}
            style={({ pressed }) => [styles.iconBtn, pressed && press]}
            accessibilityLabel="Calendar"
            accessibilityRole="button"
          >
            <Feather name="calendar" size={metrics.iconMd} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={onOpenSettings}
            hitSlop={space.md}
            style={({ pressed }) => [styles.iconBtn, pressed && press]}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Feather name="settings" size={metrics.iconMd} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
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
    gap: space.sm,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  iconBtn: {
    width: metrics.btnMd,
    height: metrics.btnMd,
    alignItems: "center",
    justifyContent: "center",
  },
});
