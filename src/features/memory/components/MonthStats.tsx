import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { ThemedText } from "@/shared/components/ThemedText";
import type { MonthOverviewStats } from "../types";

interface MonthStatsProps {
  stats: MonthOverviewStats;
}

function MonthStatsBase({ stats }: MonthStatsProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const detailItems: string[] = [];
  if (stats.photoCount > 0) {
    detailItems.push(`${stats.photoCount} ${stats.photoCount === 1 ? "photo" : "photos"}`);
  }
  if (stats.audioCount > 0) {
    detailItems.push(`${stats.audioCount} ${stats.audioCount === 1 ? "recording" : "recordings"}`);
  }
  if (stats.places.length > 0) {
    detailItems.push(`${stats.places.length} ${stats.places.length === 1 ? "place" : "places"}`);
  }

  if (detailItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.statsText, { color: colors.textSecondary }]}>
        {detailItems.join("  ·  ")}
      </ThemedText>
    </View>
  );
}

export const MonthStats = memo(MonthStatsBase);

const styles = StyleSheet.create({
  container: {
    paddingVertical: space.sm,
    marginBottom: space.lg,
  },
  statsText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});
