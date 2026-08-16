import { memo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { MonthPulseData, PulseDay } from "../types";
import { formatHeaderDate } from "@/shared/utils/dates";
import { useTheme } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";

const SKYLINE_HEIGHT = 74;
const MIN_BAR_HEIGHT = 6;

interface MonthPulseProps {
  data: MonthPulseData;
  onOpenDay: (dayTs: number) => void;
}

function MonthPulseBase({ data, onOpenDay }: MonthPulseProps) {
  const { theme, resolvedMode } = useTheme();
  const { colors } = theme;
  const dark = resolvedMode === "dark";

  // Default to first active day with moments, or first day of month
  const defaultSelected =
    data.days.find((d) => d.momentCount > 0) ?? data.days[0] ?? null;
  const [selectedDay, setSelectedDay] = useState<PulseDay | null>(defaultSelected);

  return (
    <View style={styles.container}>
      <View style={styles.skylineWrapper}>
        <View style={[styles.skylineTrack, { height: SKYLINE_HEIGHT }]}>
          {data.days.map((day) => {
            const isSelected = selectedDay?.dayNumber === day.dayNumber;
            const hasMedia = day.photoCount > 0 || day.audioCount > 0;
            const count = day.momentCount;

            const barHeight = Math.max(
              MIN_BAR_HEIGHT,
              Math.round(day.heightFactor * SKYLINE_HEIGHT)
            );

            // Active bar color vs quiet bar color
            const barColor =
              count === 0
                ? dark
                  ? "rgba(255, 255, 255, 0.12)"
                  : colors.surfaceMuted
                : colors.accent;

            const barOpacity = count === 0 ? (dark ? 0.35 : 0.6) : isSelected ? 1.0 : 0.82;

            return (
              <Pressable
                key={`pulse-day-${day.dayNumber}`}
                onPress={() => setSelectedDay(day)}
                hitSlop={{ top: 12, bottom: 12, left: 2, right: 2 }}
                style={styles.barColumn}
                accessibilityLabel={`Day ${day.dayNumber}, ${count} moments`}
                accessibilityRole="button"
              >
                {/* Media indicator pip */}
                {hasMedia && count > 0 ? (
                  <View
                    style={[
                      styles.mediaPip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.textSecondary,
                        bottom: barHeight + 4,
                      },
                    ]}
                  />
                ) : null}

                {/* Daily Activity Bar */}
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      width: isSelected ? "100%" : "78%",
                      backgroundColor: barColor,
                      opacity: barOpacity,
                    },
                    isSelected &&
                      count > 0 && {
                        shadowColor: colors.accent,
                        shadowOpacity: 0.35,
                        shadowRadius: 4,
                        elevation: 2,
                      },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Baseline Axis */}
        <View style={[styles.baseline, { backgroundColor: colors.separator }]} />

        {/* Axis Labels */}
        <View style={styles.axisLabelsRow}>
          <ThemedText style={[styles.axisLabel, { color: colors.textTertiary }]}>
            {data.startDayLabel}
          </ThemedText>

          <ThemedText style={[styles.axisMidLabel, { color: colors.textTertiary }]}>
            {data.activeDaysCount} {data.activeDaysCount === 1 ? "active day" : "active days"}
          </ThemedText>

          <ThemedText style={[styles.axisLabel, { color: colors.textTertiary }]}>
            {data.endDayLabel}
          </ThemedText>
        </View>
      </View>

      {/* Selected Day Context Callout */}
      {selectedDay ? (
        <View
          style={[
            styles.calloutCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.separator,
            },
          ]}
        >
          <View style={styles.calloutLeft}>
            <ThemedText weight="semibold" style={[styles.calloutTitle, { color: colors.text }]}>
              {formatHeaderDate(selectedDay.dayTs)}
            </ThemedText>

            <ThemedText style={[styles.calloutSub, { color: colors.textSecondary }]}>
              {selectedDay.momentCount === 0
                ? "No moments captured"
                : [
                    `${selectedDay.momentCount} ${selectedDay.momentCount === 1 ? "moment" : "moments"}`,
                    selectedDay.photoCount > 0
                      ? `${selectedDay.photoCount} ${selectedDay.photoCount === 1 ? "photo" : "photos"}`
                      : null,
                    selectedDay.audioCount > 0
                      ? `${selectedDay.audioCount} ${selectedDay.audioCount === 1 ? "recording" : "recordings"}`
                      : null,
                    selectedDay.places.length > 0
                      ? selectedDay.places.join(", ")
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </ThemedText>
          </View>

          {selectedDay.momentCount > 0 ? (
            <Pressable
              onPress={() => onOpenDay(selectedDay.dayTs)}
              hitSlop={space.sm}
              style={({ pressed }) => [styles.openDayBtn, pressed && press]}
              accessibilityLabel={`Open day ${selectedDay.dayNumber}`}
              accessibilityRole="button"
            >
              <ThemedText weight="medium" style={[styles.openDayText, { color: colors.accent }]}>
                Open day
              </ThemedText>
              <Feather name="arrow-right" size={metrics.iconXs} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const MonthPulse = memo(MonthPulseBase);

const styles = StyleSheet.create({
  container: {
    marginBottom: space.lg,
  },
  skylineWrapper: {
    paddingVertical: space.sm,
  },
  skylineTrack: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 2,
  },
  barColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 1.2,
  },
  bar: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    minHeight: MIN_BAR_HEIGHT,
  },
  mediaPip: {
    position: "absolute",
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  baseline: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginTop: space.xs,
  },
  axisLabelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.xs + 2,
    paddingHorizontal: 2,
  },
  axisLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontVariant: ["tabular-nums"],
  },
  axisMidLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  calloutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    marginTop: space.sm,
  },
  calloutLeft: {
    flex: 1,
    marginRight: space.sm,
    gap: 3,
  },
  calloutTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  calloutSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  openDayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
  },
  openDayText: {
    fontSize: 13,
  },
});
