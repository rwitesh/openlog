import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTimelineEntries } from "@/modules/entry";
import { AddEntryFab, FAB_CLEARANCE, TimelineFeed } from "@/modules/timeline";
import type { RootStackParamList } from "@/navigation/types";
import { formatHeaderDate, isSameDay } from "@/shared/utils/dates";
import { space, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Day">;

export function DayTimelineScreen({ route, navigation }: Props) {
  const { dayTs } = route.params;
  const insets = useSafeAreaInsets();
  const { entries, loadMore } = useTimelineEntries({ dayTs });
  const { theme, colors } = useTheme();
  const bgConfig = theme.backgroundConfig;

  const isToday = isSameDay(dayTs, Date.now());
  const bottomInset = isToday ? FAB_CLEARANCE + insets.bottom : insets.bottom;

  useLayoutEffect(() => {
    navigation.setOptions({ title: formatHeaderDate(dayTs) });
  }, [navigation, dayTs]);

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

      <TimelineFeed
        entries={entries}
        paddingTop={space.lg}
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
