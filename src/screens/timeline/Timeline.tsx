import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/navigation/types";
import { useEntries } from "@/features/entry";
import {
  AddEntryFab,
  FAB_CLEARANCE,
  TimelineFeed,
  TimelineHeader,
} from "@/features/timeline";
import { CalendarPicker } from "@/shared/pickers";
import {
  entriesForMonth,
  formatMonthYear,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "@/shared/utils/dates";
import { timelineContentInset } from "@/theme/spacing";

type Nav = NativeStackNavigationProp<RootStackParamList, "Timeline">;

export function TimelineScreen({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets();
  const { entries } = useEntries();

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(Date.now()));
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const isCurrentMonth = isSameMonth(viewMonth, Date.now());
  const monthEntries = useMemo(
    () => entriesForMonth(entries, viewMonth),
    [entries, viewMonth]
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

      <TimelineFeed
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
        <AddEntryFab onPress={() => navigation.navigate("Compose")} />
      ) : null}

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
