import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { formatBadgeDate, formatBadgeTime } from "@/lib/dates";
import type { EntryLocation } from "@/types/entry";
import { ThemedText } from "@/components/core/ui";

import { chip } from "./chipStyles";
import { LocationChip } from "./LocationChip";

interface DateTimeBadgesProps {
  when: number;
  onOpenDate: () => void;
  onOpenTime: () => void;
  location?: EntryLocation | null;
  locationOn?: boolean;
  locationLoading?: boolean;
  locationFailed?: boolean;
  onLocationPress?: () => void;
}

export function DateTimeBadges({
  when,
  onOpenDate,
  onOpenTime,
  location,
  locationOn,
  locationLoading,
  locationFailed,
  onLocationPress,
}: DateTimeBadgesProps) {
  const { colors } = useTheme().theme;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onOpenDate}
        style={({ pressed }) => [
          chip.base,
          { backgroundColor: colors.surfaceMuted },
          pressed && press,
        ]}
        accessibilityLabel="Change entry date"
        accessibilityRole="button"
      >
        <Feather name="calendar" size={metrics.iconSm} color={colors.text} />
        <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
          {formatBadgeDate(when)}
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={onOpenTime}
        style={({ pressed }) => [
          chip.base,
          { backgroundColor: colors.surfaceMuted },
          pressed && press,
        ]}
        accessibilityLabel="Change entry time"
        accessibilityRole="button"
      >
        <Feather name="clock" size={metrics.iconSm} color={colors.text} />
        <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
          {formatBadgeTime(when)}
        </ThemedText>
      </Pressable>

      {onLocationPress ? (
        <LocationChip
          location={location}
          on={locationOn}
          loading={locationLoading}
          failed={locationFailed}
          onPress={onLocationPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: space.sm,
    marginTop: space.lg,
    marginBottom: space.sm,
    marginHorizontal: space.xxl,
  },
});
