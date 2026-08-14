import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { Entry } from "@/types/entry";
import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import {
  addMonths,
  calendarCells,
  entryDaysInMonth,
  formatMonthYear,
  isSameDay,
  startOfMonth,
} from "@/lib";
import { BottomSheet, ThemedText } from "@/components/core";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL_HEIGHT = 40;

interface CalendarModalProps {
  visible: boolean;
  selectedDate: number;
  entries: Entry[];
  onSelectDate: (ts: number) => void;
  onClose: () => void;
}

export function CalendarModal({
  visible,
  selectedDate,
  entries,
  onSelectDate,
  onClose,
}: CalendarModalProps) {
  const { theme } = useTheme();
  const { colors } = theme;

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

  if (!visible) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} variant="center" animationType="fade">
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setViewMonth(addMonths(viewMonth, -1))}
          hitSlop={space.md}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
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
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
          accessibilityLabel="Next month"
        >
          <Feather name="chevron-right" size={metrics.iconMd} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((label, index) => (
          <ThemedText
            key={`${label}-${index}`}
            style={[styles.weekday, { color: colors.textTertiary }]}
          >
            {label}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((dayTs, index) => {
          if (dayTs === null) {
            return <View key={`blank-${index}`} style={styles.cell} />;
          }

          const selected = isSameDay(dayTs, selectedDate);
          const today = isSameDay(dayTs, Date.now());
          const showEntryDot = entryDays.has(dayTs) && !selected && !today;

          return (
            <Pressable
              key={dayTs}
              onPress={() => pickDay(dayTs)}
              style={({ pressed }) => [
                styles.cell,
                selected && { backgroundColor: colors.marker },
                !selected && today && { borderColor: colors.marker, borderWidth: 1 },
                pressed && styles.pressed,
              ]}
              accessibilityLabel={new Date(dayTs).toDateString()}
              accessibilityState={{ selected }}
            >
              <ThemedText
                style={[
                  styles.dayNum,
                  { color: selected ? colors.background : colors.text },
                ]}
              >
                {new Date(dayTs).getDate()}
              </ThemedText>

              {showEntryDot ? (
                <View style={[styles.dot, { backgroundColor: colors.marker }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
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
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 17,
    lineHeight: 22,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: space.xs,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: space.sm,
  },
  dayNum: {
    fontSize: 15,
    lineHeight: 20,
  },
  dot: {
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.65,
  },
});
