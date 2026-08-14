import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { formatStripDay, isSameDay, stripDays } from "@/lib";
import { ThemedText } from "@/components/core";

interface DateStripProps {
  selectedDate: number;
  onSelectDate: (ts: number) => void;
}

const DAY_WIDTH = 52;

export function DateStrip({ selectedDate, onSelectDate }: DateStripProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const scrollRef = useRef<ScrollView>(null);
  const days = stripDays(selectedDate);

  useEffect(() => {
    const index = days.findIndex((day) => isSameDay(day, selectedDate));
    if (index < 0) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, index * DAY_WIDTH - DAY_WIDTH * 2),
        animated: true,
      });
    });
  }, [selectedDate, days]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate);
        const today = isSameDay(day, Date.now());

        return (
          <Pressable
            key={day}
            onPress={() => onSelectDate(day)}
            style={({ pressed }) => [
              styles.day,
              selected && { backgroundColor: colors.marker },
              !selected && today && { borderColor: colors.marker, borderWidth: 1 },
              pressed && styles.pressed,
            ]}
            accessibilityLabel={formatStripDay(day)}
            accessibilityState={{ selected }}
          >
            <ThemedText
              style={[
                styles.weekday,
                { color: selected ? colors.background : colors.textTertiary },
              ]}
            >
              {new Date(day).getDate()}
            </ThemedText>
            <ThemedText
              style={[
                styles.label,
                { color: selected ? colors.background : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {formatStripDay(day)}
            </ThemedText>
            {today && !selected ? (
              <View style={[styles.todayDot, { backgroundColor: colors.marker }]} />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const DATE_STRIP_HEIGHT = metrics.dateStripHeight;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  day: {
    width: DAY_WIDTH,
    height: metrics.dateStripHeight,
    borderRadius: space.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xs,
  },
  weekday: {
    fontSize: 17,
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  todayDot: {
    position: "absolute",
    bottom: space.xs,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.65,
  },
});
