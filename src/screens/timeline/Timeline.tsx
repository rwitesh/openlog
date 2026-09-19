import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTimelineEntries } from "@/modules/entry";
import { TimelineSearchLayer } from "@/modules/search";
import { AddEntryFab, FAB_CLEARANCE, TimelineFeed, TimelineHeader } from "@/modules/timeline";
import type { RootStackParamList } from "@/navigation/types";
import { requestNotificationPermission } from "@/services/notifications";
import { CalendarPicker } from "@/shared/pickers";
import { startOfDay } from "@/shared/utils/dates";
import { useTheme } from "@/theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Timeline">;

// Let the timeline settle before the OS permission dialog interrupts.
const PERMISSION_PROMPT_DELAY_MS = 1200;

export function TimelineScreen({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  const permissionAskedRef = useRef(false);

  // Focus, not mount: onboarding lands here via both goBack and replace.
  useFocusEffect(
    useCallback(() => {
      if (permissionAskedRef.current) return;
      permissionAskedRef.current = true;

      const timer = setTimeout(
        () => void requestNotificationPermission(),
        PERMISSION_PROMPT_DELAY_MS
      );
      return () => clearTimeout(timer);
    }, [])
  );

  // Continuous newest-to-oldest feed across all time with infinite prefetching
  const { entries, loadMore } = useTimelineEntries();

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
      <TimelineHeader
        onOpenSearch={() => setSearchActive(true)}
        onOpenCalendar={() => setDayPickerOpen(true)}
        onOpenSettings={() => navigation.navigate("Settings")}
      />

      <TimelineFeed
        entries={entries}
        showDates
        bottomInset={FAB_CLEARANCE + insets.bottom}
        emptyTitle="A quiet timeline"
        emptyBody="Tap + to write, or open the calendar."
        animateFirst
        onOpenDay={openDay}
        onEndReached={loadMore}
      />

      {!searchActive ? <AddEntryFab onPress={() => navigation.navigate("Compose")} /> : null}

      <CalendarPicker
        visible={dayPickerOpen}
        selectedDate={Date.now()}
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
