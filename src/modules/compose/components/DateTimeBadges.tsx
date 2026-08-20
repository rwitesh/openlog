import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/shared/components/ThemedText";
import type { EntryLocation } from "@/shared/types";
import { formatBadgeDate, formatBadgeTime } from "@/shared/utils/dates";
import { metrics, press, space, typography, useTheme } from "@/theme";

import { chip } from "../styles/ChipStyles";
import { LocationBadge } from "./LocationBadge";

interface DateTimeBadgesProps {
  when: number;
  onOpenDate?: () => void;
  onOpenTime?: () => void;
  location?: EntryLocation | null;
  locationOn?: boolean;
  locationLoading?: boolean;
  locationFailed?: boolean;
  onLocationPress?: () => void;
  onLocationRefresh?: () => void;
  onLocationRemove?: () => void;
  readOnly?: boolean;
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
  onLocationRefresh,
  onLocationRemove,
  readOnly = false,
}: DateTimeBadgesProps) {
  const { colors } = useTheme().theme;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={readOnly ? undefined : onOpenDate}
        disabled={readOnly || !onOpenDate}
        style={({ pressed }) => [
          chip.base,
          { backgroundColor: colors.surfaceMuted },
          !readOnly && pressed && press,
        ]}
        accessibilityLabel={readOnly ? "Entry date" : "Change entry date"}
        accessibilityRole={readOnly ? undefined : "button"}
      >
        <Feather name="calendar" size={metrics.iconSm} color={colors.text} />
        <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
          {formatBadgeDate(when)}
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={readOnly ? undefined : onOpenTime}
        disabled={readOnly || !onOpenTime}
        style={({ pressed }) => [
          chip.base,
          { backgroundColor: colors.surfaceMuted },
          !readOnly && pressed && press,
        ]}
        accessibilityLabel={readOnly ? "Entry time" : "Change entry time"}
        accessibilityRole={readOnly ? undefined : "button"}
      >
        <Feather name="clock" size={metrics.iconSm} color={colors.text} />
        <ThemedText weight="medium" style={[typography.caption, { color: colors.text }]}>
          {formatBadgeTime(when)}
        </ThemedText>
      </Pressable>

      {readOnly ? (
        location ? (
          <LocationBadge location={location} readOnly />
        ) : null
      ) : onLocationPress ? (
        <LocationBadge
          location={location}
          on={locationOn}
          loading={locationLoading}
          failed={locationFailed}
          onPress={onLocationPress}
          onRefresh={onLocationRefresh}
          onRemove={onLocationRemove}
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
