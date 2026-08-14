import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/types/navigation";
import { useEntries } from "@/entries";
import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { press } from "@/theme/motion";
import {
  addMonths,
  formatMonthYear,
  getHighlightMoment,
  getMonthEntries,
  getMonthOverview,
  getMonthPulseData,
  startOfDay,
  startOfMonth,
} from "@/lib";
import { MonthPicker, ThemedText } from "@/components/core";
import { Timeline as TimelineBody } from "@/components/timeline";
import {
  MemoryHeader,
  MonthHighlight,
  MonthPulseSkyline,
  MonthSnapshotHero,
  MonthStatsLine,
  ViewMomentsAction,
} from "@/components/memory";

type Props = NativeStackScreenProps<RootStackParamList, "Memory">;

export function Memory({ route, navigation }: Props) {
  const initialMonth = route.params?.monthTs ?? Date.now();
  const [currentMonthTs, setCurrentMonthTs] = useState(() => startOfMonth(initialMonth));
  const [viewMode, setViewMode] = useState<"snapshot" | "timeline">("snapshot");
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, motion } = theme;
  const { entries } = useEntries();

  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const monthLabel = useMemo(() => formatMonthYear(currentMonthTs), [currentMonthTs]);

  const monthEntries = useMemo(
    () => getMonthEntries(entries, currentMonthTs),
    [entries, currentMonthTs]
  );

  const overviewStats = useMemo(
    () => getMonthOverview(entries, currentMonthTs),
    [entries, currentMonthTs]
  );

  const pulseData = useMemo(
    () => getMonthPulseData(entries, currentMonthTs),
    [entries, currentMonthTs]
  );

  const highlight = useMemo(
    () => getHighlightMoment(entries, currentMonthTs),
    [entries, currentMonthTs]
  );

  const entryMonths = useMemo(
    () => new Set(entries.map((e) => startOfMonth(e.createdAt))),
    [entries]
  );

  const prevMonthTs = useMemo(() => addMonths(currentMonthTs, -1), [currentMonthTs]);
  const nextMonthTs = useMemo(() => addMonths(currentMonthTs, 1), [currentMonthTs]);

  const changeMonth = useCallback(
    (newMonthTs: number) => {
      const normalized = startOfMonth(newMonthTs);
      if (normalized === currentMonthTs) return;

      if (motion.level === "reduced") {
        setCurrentMonthTs(normalized);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        return;
      }

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: motion.fast,
        easing: motion.easeOut,
        useNativeDriver: true,
      }).start(() => {
        setCurrentMonthTs(normalized);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: motion.normal,
          easing: motion.easeOut,
          useNativeDriver: true,
        }).start();
      });
    },
    [currentMonthTs, fadeAnim, motion]
  );

  const openDay = useCallback(
    (ts: number) => navigation.navigate("Day", { dayTs: startOfDay(ts) }),
    [navigation]
  );

  const handleBack = useCallback(() => {
    if (viewMode === "timeline") {
      setViewMode("snapshot");
      return;
    }
    navigation.goBack();
  }, [viewMode, navigation]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MemoryHeader
        monthLabel={monthLabel}
        isTimelineMode={viewMode === "timeline"}
        onBack={handleBack}
        onOpenMonthPicker={() => setMonthPickerOpen(true)}
        onPrevMonth={() => changeMonth(prevMonthTs)}
        onNextMonth={() => changeMonth(nextMonthTs)}
      />

      <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
        {viewMode === "snapshot" ? (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.snapshotScrollContent,
              { paddingBottom: insets.bottom + space.xxl },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <MonthSnapshotHero stats={overviewStats} />

            {monthEntries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText
                  weight="medium"
                  style={[typography.emptyTitle, { color: colors.textSecondary }]}
                >
                  A quiet month
                </ThemedText>
                <ThemedText style={[typography.emptyBody, { color: colors.textTertiary }]}>
                  Nothing captured in {monthLabel.toLowerCase()}.
                </ThemedText>
              </View>
            ) : (
              <>
                <MonthPulseSkyline
                  data={pulseData}
                  onOpenDay={openDay}
                />

                <MonthStatsLine stats={overviewStats} />

                {highlight ? (
                  <MonthHighlight highlight={highlight} onPressDay={openDay} />
                ) : null}

                <ViewMomentsAction
                  momentCount={monthEntries.length}
                  monthName={monthLabel}
                  onPress={() => setViewMode("timeline")}
                />
              </>
            )}
          </ScrollView>
        ) : (
          <View style={styles.timelineModeContainer}>
            <View style={styles.timelineModeHeader}>
              <Pressable
                onPress={() => setViewMode("snapshot")}
                hitSlop={space.sm}
                style={({ pressed }) => [styles.modeSwitchBtn, pressed && press]}
                accessibilityLabel="Back to month snapshot"
                accessibilityRole="button"
              >
                <Feather name="chevron-left" size={metrics.iconSm} color={colors.textSecondary} />
                <ThemedText
                  weight="medium"
                  style={[styles.modeSwitchText, { color: colors.textSecondary }]}
                >
                  Month snapshot
                </ThemedText>
              </Pressable>
            </View>

            <TimelineBody
              entries={monthEntries}
              showDates
              paddingTop={space.sm}
              bottomInset={insets.bottom + space.xl}
              emptyTitle="A quiet month"
              emptyBody={`Nothing written in ${monthLabel.toLowerCase()}.`}
              onOpenDay={openDay}
            />
          </View>
        )}
      </Animated.View>

      <MonthPicker
        visible={monthPickerOpen}
        selectedMonth={currentMonthTs}
        top={insets.top + metrics.headerRowHeight + space.sm}
        entryMonths={entryMonths}
        onSelect={(selected) => {
          changeMonth(selected);
          setMonthPickerOpen(false);
        }}
        onClose={() => setMonthPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  snapshotScrollContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
  },
  emptyContainer: {
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    alignItems: "flex-start",
    gap: space.xs + 2,
  },
  timelineModeContainer: {
    flex: 1,
  },
  timelineModeHeader: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  modeSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    alignSelf: "flex-start",
    paddingVertical: space.xs,
  },
  modeSwitchText: {
    fontSize: 14,
    lineHeight: 18,
  },
});
