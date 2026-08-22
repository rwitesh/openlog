import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEntries } from "@/modules/entry";
import { TimelineSearchLayer } from "@/modules/search";
import { AddEntryFab, FAB_CLEARANCE, TimelineFeed, TimelineHeader } from "@/modules/timeline";
import type { RootStackParamList } from "@/navigation/types";
import { CalendarPicker } from "@/shared/pickers";
import {
  entriesForMonth,
  formatMonthYear,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "@/shared/utils/dates";
import { timelineContentInset, useTheme } from "@/theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Timeline">;

export function TimelineScreen({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets();
  const { entries } = useEntries();
  const { theme, colors } = useTheme();
  const bgConfig = theme.backgroundConfig;

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(Date.now()));
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [searchActive, setSearchActive] = useState(false);

  const isCurrentMonth = isSameMonth(viewMonth, Date.now());
  const monthEntries = useMemo(() => entriesForMonth(entries, viewMonth), [entries, viewMonth]);

  const openDay = useCallback(
    (ts: number) => navigation.navigate("Day", { dayTs: startOfDay(ts) }),
    [navigation]
  );

  const closeSearch = useCallback(() => setSearchActive(false), []);

  const openEntryFromSearch = useCallback(
    (entryId: string) => {
      setSearchActive(false);
      navigation.navigate("Compose", { entryId, mode: "view" });
    },
    [navigation]
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {bgConfig?.imageSource ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image
            source={bgConfig.imageSource}
            style={[StyleSheet.absoluteFill, { opacity: bgConfig.opacity ?? 0.35 }]}
            resizeMode="cover"
          />
        </View>
      ) : null}
      <TimelineHeader
        selectedMonth={viewMonth}
        onOpenMonth={() => navigation.navigate("Memory", { monthTs: viewMonth })}
        onOpenSearch={() => setSearchActive(true)}
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

      {isCurrentMonth && !searchActive ? (
        <AddEntryFab onPress={() => navigation.navigate("Compose")} />
      ) : null}

      <CalendarPicker
        visible={dayPickerOpen}
        selectedDate={Date.now()}
        entries={entries}
        onSelectDate={openDay}
        onClose={() => setDayPickerOpen(false)}
      />

      {searchActive ? (
        <TimelineSearchLayer onClose={closeSearch} onOpenEntry={openEntryFromSearch} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
