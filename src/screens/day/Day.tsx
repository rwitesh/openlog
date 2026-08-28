import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTimelineEntries } from "@/modules/entry";
import { AddEntryFab, FAB_CLEARANCE, TimelineFeed } from "@/modules/timeline";
import type { RootStackParamList } from "@/navigation/types";
import { ScreenHeader } from "@/shared/components";
import { formatHeaderDate, isSameDay } from "@/shared/utils/dates";
import { space, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Day">;

export function DayTimelineScreen({ route, navigation }: Props) {
  const { dayTs } = route.params;
  const insets = useSafeAreaInsets();
  const { entries, loadMore } = useTimelineEntries({ dayTs });
  const { colors } = useTheme();

  const isToday = isSameDay(dayTs, Date.now());
  const bottomInset = isToday ? FAB_CLEARANCE + insets.bottom : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title={formatHeaderDate(dayTs)} onBack={() => navigation.goBack()} />

      <TimelineFeed
        entries={entries}
        paddingTop={space.sm}
        bottomInset={bottomInset}
        emptyTitle="A quiet day"
        emptyBody={isToday ? "Tap + to write." : "Nothing written that day."}
        animateFirst={isToday}
        onEndReached={loadMore}
      />

      {isToday ? <AddEntryFab onPress={() => navigation.navigate("Compose")} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
