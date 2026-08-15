import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { usePreferences, useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { fontFamily } from "@/theme/typography";
import { ThemedText } from "@/shared/components/ThemedText";
import type { MonthOverviewStats } from "../types";

interface MonthHeroProps {
  stats: MonthOverviewStats;
}

function MonthHeroBase({ stats }: MonthHeroProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences } = usePreferences();
  const { fontChoice } = preferences.appearance;

  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <ThemedText
          weight="semibold"
          style={[
            styles.monthName,
            {
              color: colors.text,
              fontFamily: fontFamily("semibold", fontChoice),
            },
          ]}
        >
          {stats.monthNameUpper}
        </ThemedText>
        <ThemedText
          weight="medium"
          style={[styles.yearNumber, { color: colors.textSecondary }]}
        >
          {stats.yearNumber}
        </ThemedText>
      </View>

      <ThemedText
        weight="medium"
        style={[styles.momentCount, { color: colors.text }]}
      >
        {stats.momentCount === 0
          ? "A quiet month"
          : `${stats.momentCount} ${stats.momentCount === 1 ? "moment" : "moments"}`}
      </ThemedText>
    </View>
  );
}

export const MonthHero = memo(MonthHeroBase);

const styles = StyleSheet.create({
  container: {
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  titleBlock: {
    marginBottom: space.xs,
  },
  monthName: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 2,
  },
  yearNumber: {
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  momentCount: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    marginTop: space.xs,
  },
});
