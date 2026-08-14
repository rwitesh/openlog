import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography, FONT_SIZE } from "@/theme/typography";
import { formatMonthYear, isSameMonth, monthsBetween, startOfMonth } from "@/lib";
import { Sheet, ThemedText } from "@/components/core";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 6;
/** Oldest month the list shows. */
const EARLIEST = startOfMonth(new Date(2026, 0, 1).getTime());

interface MonthPickerProps {
  visible: boolean;
  selectedMonth: number;
  /** Y position the dropdown hangs from (bottom of the header). */
  top: number;
  /** Start-of-month timestamps that contain entries. */
  entryMonths: Set<number>;
  onSelect: (monthTs: number) => void;
  onClose: () => void;
}

/** Dropdown month list for jumping the feed to any month. */
export function MonthPicker({
  visible,
  selectedMonth,
  top,
  entryMonths,
  onSelect,
  onClose,
}: MonthPickerProps) {
  const { colors } = useTheme().theme;

  // Newest first, matching the feed. Current month is always the top row.
  const months = useMemo(
    () => monthsBetween(EARLIEST, startOfMonth(Date.now())).reverse(),
    []
  );

  const selectedIndex = months.indexOf(startOfMonth(selectedMonth));

  const pick = (monthTs: number) => {
    onSelect(monthTs);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      placement="top"
      sheetStyle={[styles.sheet, { marginTop: top }]}
    >
      <View style={styles.headerRow}>
        <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
          Month
        </ThemedText>

        <Pressable
          onPress={() => pick(startOfMonth(Date.now()))}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.resetBtn, pressed && press]}
          accessibilityLabel="Back to current month"
        >
          <Feather name="rotate-ccw" size={metrics.iconXs} color={colors.textSecondary} />
          <ThemedText weight="medium" style={[styles.resetLabel, { color: colors.textSecondary }]}>
            Current
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={months}
        keyExtractor={(month) => String(month)}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        initialScrollIndex={Math.max(0, selectedIndex)}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const selected = isSameMonth(item, selectedMonth);

          return (
            <Pressable
              onPress={() => pick(item)}
              style={({ pressed }) => [styles.row, pressed && press]}
              accessibilityLabel={formatMonthYear(item)}
              accessibilityState={{ selected }}
            >
              <ThemedText
                weight={selected ? "semibold" : "regular"}
                style={[
                  typography.settingLabel,
                  { color: selected ? colors.text : colors.textSecondary },
                ]}
              >
                {formatMonthYear(item)}
              </ThemedText>

              <View style={styles.rowEnd}>
                {entryMonths.has(item) ? (
                  <View style={[styles.dot, { backgroundColor: colors.marker }]} />
                ) : null}
                {selected ? (
                  <Feather name="check" size={metrics.iconSm} color={colors.marker} />
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: 264,
    paddingTop: space.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.xs,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    lineHeight: 22,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  resetLabel: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  list: {
    height: ROW_HEIGHT * VISIBLE_ROWS,
    flexGrow: 0,
    marginBottom: space.xs,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
