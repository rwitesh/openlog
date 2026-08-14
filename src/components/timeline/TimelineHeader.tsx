import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { formatHeaderDate } from "@/lib";
import { ThemedText } from "@/components/core";
import { DateStrip, DATE_STRIP_HEIGHT } from "./DateStrip";

/** Total overlay height for list padding (safe area + header + date strip). */
export function getTimelineHeaderHeight(insetsTop: number): number {
  return insetsTop + space.md + metrics.headerRowHeight + space.sm + DATE_STRIP_HEIGHT + space.lg;
}

interface TimelineHeaderProps {
  selectedDate: number;
  onSelectDate: (ts: number) => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
}

export function TimelineHeader({
  selectedDate,
  onSelectDate,
  onOpenCalendar,
  onOpenSettings,
}: TimelineHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + space.md,
          backgroundColor: colors.background,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onOpenCalendar}
          hitSlop={space.md}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityLabel="Open calendar"
          accessibilityRole="button"
        >
          <Feather name="calendar" size={metrics.iconMd} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={onOpenCalendar}
          style={({ pressed }) => [styles.titleWrap, pressed && styles.pressed]}
          accessibilityLabel={formatHeaderDate(selectedDate)}
        >
          <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
            {formatHeaderDate(selectedDate)}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={onOpenSettings}
          hitSlop={space.md}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Feather name="settings" size={metrics.iconMd} color={colors.textSecondary} />
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
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: metrics.headerRowHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    marginBottom: space.sm,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: space.sm,
  },
  title: {
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.5,
  },
});
