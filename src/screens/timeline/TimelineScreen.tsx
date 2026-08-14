import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/hooks/useEntries";
import { fromComposer, isSameDay, startOfDay, type ComposerResult } from "@/lib";
import {
  AddButton,
  FAB_CLEARANCE,
  CalendarModal,
  TimelineHeader,
  TimelineList,
  type TimelineListHandle,
} from "@/components/timeline";
import { Composer } from "@/components/entry";

type TimelineNav = NativeStackNavigationProp<RootStackParamList, "Timeline">;

export function TimelineScreen({ navigation }: { navigation: TimelineNav }) {
  const insets = useSafeAreaInsets();
  const { entries, addEntry } = useEntries();
  const listRef = useRef<TimelineListHandle>(null);

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(Date.now()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const isToday = isSameDay(selectedDate, Date.now());
  const bottomInset = isToday ? FAB_CLEARANCE + insets.bottom : insets.bottom;

  const handleSave = useCallback(
    async (result: ComposerResult) => {
      const input = await fromComposer(result);
      if (!input) return;

      await addEntry(input);
      setSelectedDate(startOfDay(Date.now()));
      requestAnimationFrame(() => listRef.current?.scrollToTop());
    },
    [addEntry]
  );

  const openCalendar = () => setCalendarOpen(true);

  const selectDate = (ts: number) => {
    setSelectedDate(startOfDay(ts));
  };

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => listRef.current?.scrollToTop());
    }, [selectedDate])
  );

  return (
    <View style={styles.flex}>
      <TimelineHeader
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onOpenCalendar={openCalendar}
        onOpenSettings={() => navigation.navigate("Settings")}
        onLayout={setHeaderHeight}
      />

      <TimelineList
        ref={listRef}
        entries={entries}
        selectedDate={selectedDate}
        headerHeight={headerHeight}
        bottomInset={bottomInset}
      />

      {isToday ? <AddButton onPress={() => setComposerOpen(true)} /> : null}

      <CalendarModal
        visible={calendarOpen}
        selectedDate={selectedDate}
        entries={entries}
        onSelectDate={selectDate}
        onClose={() => setCalendarOpen(false)}
      />

      <Composer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
