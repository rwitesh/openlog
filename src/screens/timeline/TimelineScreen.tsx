import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/hooks/useEntries";
import { Timeline } from "@/components/core";
import {
  entriesForMonth,
  formatMonthYear,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "@/lib";
import {
  AddButton,
  FAB_CLEARANCE,
  CalendarModal,
  MonthPicker,
  TimelineHeader,
} from "@/components/timeline";

type TimelineNav = NativeStackNavigationProp<RootStackParamList, "Timeline">;

export function TimelineScreen({ navigation }: { navigation: TimelineNav }) {
  const insets = useSafeAreaInsets();
  const { entries } = useEntries();

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(Date.now()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const isCurrentMonth = isSameMonth(viewMonth, Date.now());
  const monthEntries = useMemo(
    () => entriesForMonth(entries, viewMonth),
    [entries, viewMonth]
  );
  const entryMonths = useMemo(
    () => new Set(entries.map((entry) => startOfMonth(entry.createdAt))),
    [entries]
  );

  const openDay = useCallback(
    (ts: number) => navigation.navigate("Day", { dayTs: startOfDay(ts) }),
    [navigation]
  );

  return (
    <View style={styles.flex}>
      <TimelineHeader
        viewMonth={viewMonth}
        onOpenMonthPicker={() => setMonthPickerOpen(true)}
        onOpenCalendar={() => setCalendarOpen(true)}
        onOpenSettings={() => navigation.navigate("Settings")}
        onLayout={setHeaderHeight}
      />

      <Timeline
        entries={monthEntries}
        showDates
        paddingTop={headerHeight}
        bottomInset={isCurrentMonth ? FAB_CLEARANCE + insets.bottom : insets.bottom}
        emptyTitle="A quiet month"
        emptyBody={
          isCurrentMonth
            ? "Tap + to write, or open the calendar."
            : `Nothing written in ${formatMonthYear(viewMonth).toLowerCase()}.`
        }
        animateFirst={isCurrentMonth}
        onOpenDay={openDay}
      />

      {isCurrentMonth ? (
        <AddButton onPress={() => navigation.navigate("Compose")} />
      ) : null}

      <MonthPicker
        visible={monthPickerOpen}
        selectedMonth={viewMonth}
        top={headerHeight}
        entryMonths={entryMonths}
        onSelect={setViewMonth}
        onClose={() => setMonthPickerOpen(false)}
      />

      <CalendarModal
        visible={calendarOpen}
        selectedDate={startOfDay(Date.now())}
        entries={entries}
        onSelectDate={openDay}
        onClose={() => setCalendarOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
