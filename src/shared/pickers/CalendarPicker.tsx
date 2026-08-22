import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { getEntryDaysForMonth } from "@/services/db/entries";
import { Sheet } from "@/shared/components/Sheet";
import { ThemedText } from "@/shared/components/ThemedText";
import {
  addMonths,
  calendarCells,
  formatMonthYear,
  isSameDay,
  startOfMonth,
} from "@/shared/utils/dates";
import { FONT_SIZE, metrics, press, radius, space, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme/tokens";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL_GAP = space.sm;

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: number;
  onSelectDate: (ts: number) => void;
  onClose: () => void;
}

interface CalendarDayProps {
  dayTs: number;
  selected: boolean;
  today: boolean;
  hasEntry: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function CalendarDay({ dayTs, selected, today, hasEntry, colors, onPress }: CalendarDayProps) {
  const dayNumber = new Date(dayTs).getDate();

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
        <ThemedText style={[styles.dayNum, { color: selected ? colors.background : colors.text }]}>
          {dayNumber}
        </ThemedText>

        {hasEntry && !selected && !today ? (
          <View style={[styles.dot, { backgroundColor: colors.marker }]} />
        ) : null}
      </Pressable>
    </View>
  );
}

export function CalendarPicker({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}: CalendarPickerProps) {
  const { colors } = useTheme().theme;
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));
  const [entryDays, setEntryDays] = useState<Set<number>>(new Set());

  // Sync viewed month with selectedDate whenever modal opens
  useEffect(() => {
    if (visible) {
      setViewMonth(startOfMonth(selectedDate));
    }
  }, [visible, selectedDate]);

  // Fetch active entry days for the currently visible month
  useEffect(() => {
    if (!visible) return;

    let active = true;
    getEntryDaysForMonth(viewMonth).then((days) => {
      if (active) setEntryDays(days);
    });

    return () => {
      active = false;
    };
  }, [visible, viewMonth]);

  const cells = useMemo(() => calendarCells(viewMonth), [viewMonth]);

  const handleSelectDay = (dayTs: number) => {
    onSelectDate(dayTs);
    onClose();
  };

  const todayTs = Date.now();

  return (
    <Sheet visible={visible} onClose={onClose} placement="center" animationType="fade">
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setViewMonth((prev) => addMonths(prev, -1))}
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
          onPress={() => setViewMonth((prev) => addMonths(prev, 1))}
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

          return (
            <CalendarDay
              key={dayTs}
              dayTs={dayTs}
              selected={isSameDay(dayTs, selectedDate)}
              today={isSameDay(dayTs, todayTs)}
              hasEntry={entryDays.has(dayTs)}
              colors={colors}
              onPress={() => handleSelectDay(dayTs)}
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
