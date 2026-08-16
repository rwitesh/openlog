import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { Entry } from "@/shared/types";
import { useTheme } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { FONT_SIZE } from "@/theme/typography";
import {
  addMonths,
  calendarCells,
  entryDaysInMonth,
  formatMonthYear,
  isSameDay,
  startOfMonth,
} from "@/shared/utils/dates";
import { Sheet } from "@/shared/components/Sheet";
import { ThemedText } from "@/shared/components/ThemedText";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL_GAP = space.sm;

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: number;
  entries?: Entry[];
  onSelectDate: (ts: number) => void;
  onClose: () => void;
}

function CalendarDay({
  dayTs,
  selected,
  today,
  showEntryDot,
  onPress,
}: {
  dayTs: number;
  selected: boolean;
  today: boolean;
  showEntryDot: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme().theme;

  return (
    <View style={styles.cellSlot}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cell,
          selected && { backgroundColor: colors.marker },
          !selected && today && { borderColor: colors.marker, borderWidth: 1 },
          pressed && press,
        ]}
        accessibilityLabel={new Date(dayTs).toDateString()}
        accessibilityState={{ selected }}
      >
        <ThemedText
          style={[styles.dayNum, { color: selected ? colors.background : colors.text }]}
        >
          {new Date(dayTs).getDate()}
        </ThemedText>

        {showEntryDot ? (
          <View style={[styles.dot, { backgroundColor: colors.marker }]} />
        ) : null}
      </Pressable>
    </View>
  );
}

export function CalendarPicker({
  visible,
  selectedDate,
  entries = [],
  onSelectDate,
  onClose,
}: CalendarPickerProps) {
  const { colors } = useTheme().theme;
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  useEffect(() => {
    if (!visible) return;
    setViewMonth(startOfMonth(selectedDate));
  }, [visible, selectedDate]);

  const entryDays = useMemo(
    () => entryDaysInMonth(entries, viewMonth),
    [entries, viewMonth]
  );

  const cells = calendarCells(viewMonth);

  const pickDay = (dayTs: number) => {
    onSelectDate(dayTs);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} placement="center" animationType="fade">
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setViewMonth(addMonths(viewMonth, -1))}
          hitSlop={space.md}
          style={({ pressed }) => [styles.navBtn, pressed && press]}
          accessibilityLabel="Previous month"
        >
          <Feather name="chevron-left" size={metrics.iconMd} color={colors.textSecondary} />
        </Pressable>

        <ThemedText weight="semibold" style={[styles.monthLabel, { color: colors.text }]}>
          {formatMonthYear(viewMonth)}
        </ThemedText>

        <Pressable
          onPress={() => setViewMonth(addMonths(viewMonth, 1))}
          hitSlop={space.md}
          style={({ pressed }) => [styles.navBtn, pressed && press]}
          accessibilityLabel="Next month"
        >
          <Feather name="chevron-right" size={metrics.iconMd} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((label, index) => (
          <View key={`${label}-${index}`} style={styles.cellSlot}>
            <ThemedText style={[styles.weekday, { color: colors.textTertiary }]}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((dayTs, index) => {
          if (dayTs === null) {
            return <View key={`blank-${index}`} style={styles.cellSlot} />;
          }

          const selected = isSameDay(dayTs, selectedDate);
          const today = isSameDay(dayTs, Date.now());
          const showEntryDot = entryDays.has(dayTs) && !selected && !today;

          return (
            <CalendarDay
              key={dayTs}
              dayTs={dayTs}
              selected={selected}
              today={today}
              showEntryDot={showEntryDot}
              onPress={() => pickDay(dayTs)}
            />
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  navBtn: {
    width: metrics.btnMd,
    height: metrics.btnMd,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: FONT_SIZE.xl,
    lineHeight: 22,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: space.sm,
  },
  weekday: {
    textAlign: "center",
    fontSize: FONT_SIZE.xs,
    lineHeight: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cellSlot: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: CELL_GAP / 2,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  dayNum: {
    fontSize: FONT_SIZE.lg,
    lineHeight: 20,
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
