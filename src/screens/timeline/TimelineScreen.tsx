import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/hooks/useEntries";
import { buildEntryInput, isSameDay, startOfDay, type ComposerResult } from "@/lib";
import {
  AddEntryButton,
  ADD_ENTRY_BUTTON_CLEARANCE,
  CalendarModal,
  TimelineHeader,
  TimelineList,
  getTimelineHeaderHeight,
  type TimelineListHandle,
} from "@/components/timeline";
import { EntryComposerModal } from "@/components/entry";

type TimelineNav = NativeStackNavigationProp<RootStackParamList, "Timeline">;

export function TimelineScreen({ navigation }: { navigation: TimelineNav }) {
  const insets = useSafeAreaInsets();
  const { entries, addEntry } = useEntries();
  const listRef = useRef<TimelineListHandle>(null);

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(Date.now()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const isToday = isSameDay(selectedDate, Date.now());
  const headerHeight = getTimelineHeaderHeight(insets.top);
  const bottomInset = isToday ? ADD_ENTRY_BUTTON_CLEARANCE + insets.bottom : insets.bottom;

  const handleSave = useCallback(
    async (result: ComposerResult) => {
      const input = await buildEntryInput(result);
      if (!input) return;

      await addEntry(input);
      setSelectedDate(startOfDay(Date.now()));
      requestAnimationFrame(() => listRef.current?.scrollToEnd());
    },
    [addEntry]
  );

  const openCalendar = () => setCalendarOpen(true);

  const selectDate = (ts: number) => {
    setSelectedDate(startOfDay(ts));
  };

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => listRef.current?.scrollToEnd());
    }, [selectedDate])
  );

  return (
    <View style={styles.flex}>
      <TimelineHeader
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onOpenCalendar={openCalendar}
        onOpenSettings={() => navigation.navigate("Settings")}
      />

      <TimelineList
        ref={listRef}
        entries={entries}
        selectedDate={selectedDate}
        headerHeight={headerHeight}
        bottomInset={bottomInset}
      />

      {isToday ? <AddEntryButton onPress={() => setComposerOpen(true)} /> : null}

      <CalendarModal
        visible={calendarOpen}
        selectedDate={selectedDate}
        entries={entries}
        onSelectDate={selectDate}
        onClose={() => setCalendarOpen(false)}
      />

      <EntryComposerModal
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
