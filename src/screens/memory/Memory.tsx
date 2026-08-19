import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/navigation/types";
import { useEntries } from "@/modules/entry";
import {
  MonthHeader,
  MonthHero,
  MonthPulse,
  MonthStats,
  getMonthOverview,
  getMonthPulseData,
} from "@/modules/memory";
import { useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import {
  addMonths,
  formatMonthYear,
  getMonthEntries,
  startOfDay,
  startOfMonth,
} from "@/shared/utils/dates";
import { MonthPicker } from "@/shared/pickers";
import { ThemedText } from "@/shared/components/ThemedText";

type Props = NativeStackScreenProps<RootStackParamList, "Memory">;

export function MemoryScreen({ route, navigation }: Props) {
  const initialMonth = route.params?.monthTs ?? Date.now();
  const [currentMonthTs, setCurrentMonthTs] = useState(() => startOfMonth(initialMonth));
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

  return (
    <View style={styles.screen}>
      <MonthHeader
        monthLabel={monthLabel}
        onBack={() => navigation.goBack()}
        onOpenMonthPicker={() => setMonthPickerOpen(true)}
        onPrevMonth={() => changeMonth(prevMonthTs)}
        onNextMonth={() => changeMonth(nextMonthTs)}
      />

      <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + space.xxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <MonthHero stats={overviewStats} />

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
              <MonthPulse
                data={pulseData}
                onOpenDay={openDay}
              />

              <MonthStats stats={overviewStats} />
            </>
          )}
        </ScrollView>
      </Animated.View>

      <MonthPicker
        visible={monthPickerOpen}
        selectedMonth={currentMonthTs}
        top={insets.top + space.xxl}
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
  scrollContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
  },
  emptyContainer: {
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    alignItems: "flex-start",
    gap: space.xs + 2,
  },
});
