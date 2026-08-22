import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeMutations } from "@/modules/entry";
import {
  getMonthOverview,
  getMonthPulseData,
  MonthHeader,
  MonthHero,
  MonthPulse,
  MonthStats,
} from "@/modules/memory";
import type { RootStackParamList } from "@/navigation/types";
import { getEntriesForMonth } from "@/services/db/entries";
import { ThemedText } from "@/shared/components/ThemedText";
import { MonthPicker } from "@/shared/pickers";
import type { Entry } from "@/shared/types";
import { addMonths, formatMonthYear, startOfDay, startOfMonth } from "@/shared/utils/dates";
import { space, typography, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Memory">;

export function MemoryScreen({ route, navigation }: Props) {
  const initialMonth = route.params?.monthTs ?? Date.now();
  const [currentMonthTs, setCurrentMonthTs] = useState(() => startOfMonth(initialMonth));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthEntries, setMonthEntries] = useState<Entry[]>([]);

  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, motion } = theme;

  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;

    const reload = () => {
      getEntriesForMonth(currentMonthTs).then((entries) => {
        if (active) setMonthEntries(entries);
      });
    };

    reload();
    const unsubscribe = subscribeMutations(reload);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentMonthTs]);

  const monthLabel = useMemo(() => formatMonthYear(currentMonthTs), [currentMonthTs]);

  const overviewStats = useMemo(
    () => getMonthOverview(monthEntries, currentMonthTs),
    [monthEntries, currentMonthTs]
  );

  const pulseData = useMemo(
    () => getMonthPulseData(monthEntries, currentMonthTs),
    [monthEntries, currentMonthTs]
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
              <ThemedText weight="semibold" style={[typography.emptyTitle, { color: colors.text }]}>
                A quiet month
              </ThemedText>
              <ThemedText style={[typography.emptyBody, { color: colors.textSecondary }]}>
                Nothing captured in {monthLabel.toLowerCase()}.
              </ThemedText>
            </View>
          ) : (
            <>
              <MonthPulse data={pulseData} onOpenDay={openDay} />

              <MonthStats stats={overviewStats} />
            </>
          )}
        </ScrollView>
      </Animated.View>

      <MonthPicker
        visible={monthPickerOpen}
        selectedMonth={currentMonthTs}
        top={insets.top + space.xxl}
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
