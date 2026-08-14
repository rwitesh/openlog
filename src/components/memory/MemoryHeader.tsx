import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { ThemedText } from "@/components/core/ui";

interface MemoryHeaderProps {
  monthLabel: string;
  isTimelineMode?: boolean;
  onBack: () => void;
  onOpenMonthPicker: () => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onToggleMode?: () => void;
  hasPrevMonth?: boolean;
  hasNextMonth?: boolean;
}

function MemoryHeaderBase({
  monthLabel,
  isTimelineMode = false,
  onBack,
  onOpenMonthPicker,
  onPrevMonth,
  onNextMonth,
  onToggleMode,
  hasPrevMonth = true,
  hasNextMonth = true,
}: MemoryHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme, resolvedMode } = useTheme();
  const { colors } = theme;
  const dark = resolvedMode === "dark";

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm, backgroundColor: colors.background }]}>
      <View style={styles.contentRow}>
        <Pressable
          onPress={onBack}
          hitSlop={space.md}
          style={({ pressed }) => [styles.backBtn, pressed && press]}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={metrics.iconMd} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={onOpenMonthPicker}
          hitSlop={space.sm}
          style={({ pressed }) => [
            styles.monthChip,
            {
              backgroundColor: dark ? "rgba(255, 255, 255, 0.08)" : colors.surface,
              borderColor: dark ? "rgba(255, 255, 255, 0.12)" : colors.separator,
            },
            pressed && press,
          ]}
          accessibilityLabel={`${monthLabel}, pick another month`}
          accessibilityRole="button"
        >
          <ThemedText weight="medium" style={[styles.chipText, { color: colors.text }]}>
            {monthLabel}
          </ThemedText>
          <Feather name="chevron-down" size={metrics.iconXs} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.navArrows}>
          <Pressable
            onPress={onPrevMonth}
            disabled={!hasPrevMonth}
            hitSlop={space.sm}
            style={({ pressed }) => [
              styles.arrowBtn,
              !hasPrevMonth && styles.disabled,
              pressed && hasPrevMonth && press,
            ]}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
          >
            <Feather
              name="chevron-left"
              size={metrics.iconMd}
              color={hasPrevMonth ? colors.textSecondary : colors.textTertiary}
            />
          </Pressable>

          <Pressable
            onPress={onNextMonth}
            disabled={!hasNextMonth}
            hitSlop={space.sm}
            style={({ pressed }) => [
              styles.arrowBtn,
              !hasNextMonth && styles.disabled,
              pressed && hasNextMonth && press,
            ]}
            accessibilityLabel="Next month"
            accessibilityRole="button"
          >
            <Feather
              name="chevron-right"
              size={metrics.iconMd}
              color={hasNextMonth ? colors.textSecondary : colors.textTertiary}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const MemoryHeader = memo(MemoryHeaderBase);

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.06)",
    zIndex: 10,
  },
  contentRow: {
    height: metrics.headerRowHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: metrics.btnMd,
    height: metrics.btnMd,
    alignItems: "center",
    justifyContent: "center",
  },
  monthChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 18,
  },
  navArrows: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  arrowBtn: {
    width: metrics.btnMd,
    height: metrics.btnMd,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.3,
  },
});
