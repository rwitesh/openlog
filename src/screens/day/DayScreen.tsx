import { useLayoutEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/hooks/useEntries";
import { Timeline } from "@/components/core";
import { entriesForDay, formatHeaderDate, isSameDay } from "@/lib";
import { AddButton, FAB_CLEARANCE } from "@/components/timeline";
import { space } from "@/theme/spacing";

type DayProps = NativeStackScreenProps<RootStackParamList, "Day">;

export function DayScreen({ route, navigation }: DayProps) {
  const { dayTs } = route.params;
  const insets = useSafeAreaInsets();
  const { entries } = useEntries();

  const isToday = isSameDay(dayTs, Date.now());
  const dayEntries = useMemo(() => entriesForDay(entries, dayTs), [entries, dayTs]);
  const bottomInset = isToday ? FAB_CLEARANCE + insets.bottom : insets.bottom;

  useLayoutEffect(() => {
    navigation.setOptions({ title: formatHeaderDate(dayTs) });
  }, [navigation, dayTs]);

  return (
    <View style={styles.flex}>
      <Timeline
        entries={dayEntries}
        paddingTop={space.lg}
        bottomInset={bottomInset}
        emptyTitle="A quiet day"
        emptyBody={isToday ? "Tap + to write." : "Nothing written that day."}
        animateFirst={isToday}
      />

      {isToday ? <AddButton onPress={() => navigation.navigate("Compose")} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
