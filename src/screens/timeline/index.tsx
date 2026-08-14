import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/entries";
import {
  AddButton,
  FAB_CLEARANCE,
  Timeline as TimelineBody,
  TimelineHeader,
} from "@/components/timeline";
import { CalendarPicker, MonthPicker } from "@/components/core";
import {
  entriesForMonth,
  formatMonthYear,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "@/lib";
import { timelineContentInset } from "@/theme/spacing";

type Nav = NativeStackNavigationProp<RootStackParamList, "Timeline">;

export function Timeline({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets();
  const { entries } = useEntries();

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(Date.now()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
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
        selectedMonth={viewMonth}
        onOpenMonth={() => navigation.navigate("Memory", { monthTs: viewMonth })}
        onOpenCalendar={() => setDayPickerOpen(true)}
        onOpenSettings={() => navigation.navigate("Settings")}
        onLayout={setHeaderHeight}
      />

      <TimelineBody
        entries={monthEntries}
        showDates
        paddingTop={timelineContentInset(headerHeight)}
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

      <CalendarPicker
        visible={dayPickerOpen}
        selectedDate={Date.now()}
        entries={entries}
        onSelectDate={openDay}
        onClose={() => setDayPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
