import { memo } from "react";
import { StyleSheet, View } from "react-native";

import type { MonthOverviewStats } from "@/lib";
import { usePreferences, useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { fontFamily } from "@/theme/typography";
import { ThemedText } from "@/components/core/ui";

interface MonthSnapshotHeroProps {
  stats: MonthOverviewStats;
}

function MonthSnapshotHeroBase({ stats }: MonthSnapshotHeroProps) {
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

export const MonthSnapshotHero = memo(MonthSnapshotHeroBase);

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
