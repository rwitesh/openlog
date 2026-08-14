import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatStripDay, isSameDay, startOfDay, stripDays } from "@/lib";
import { ThemedText } from "@/components/core";

interface DateStripProps {
  selectedDate: number;
  onSelectDate: (ts: number) => void;
}

const PILL_WIDTH = 52;
const PILL_GAP = space.sm;
const PILL_STRIDE = PILL_WIDTH + PILL_GAP;

function DayPill({
  day,
  selected,
  today,
  onPress,
}: {
  day: number;
  selected: boolean;
  today: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme().theme;

  return (
    <Pressable
      onPress={onPress}
      style={styles.pill}
      accessibilityLabel={formatStripDay(day)}
      accessibilityState={{ selected }}
    >
      <View
        style={[
          styles.pillInner,
          {
            backgroundColor: selected ? colors.marker : "transparent",
            borderColor: colors.marker,
            borderWidth: !selected && today ? 1 : 0,
          },
        ]}
      >
        <ThemedText
          weight={selected ? "semibold" : "medium"}
          style={[styles.dayNum, { color: selected ? colors.background : colors.textSecondary }]}
        >
          {new Date(day).getDate()}
        </ThemedText>
        <ThemedText
          style={[styles.label, { color: selected ? colors.background : colors.textTertiary }]}
          numberOfLines={1}
        >
          {formatStripDay(day)}
        </ThemedText>
        {today && !selected ? (
          <View style={[styles.todayDot, { backgroundColor: colors.marker }]} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function DateStrip({ selectedDate, onSelectDate }: DateStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const viewportWidth = useRef(0);

  const [stripAnchor, setStripAnchor] = useState(() => startOfDay(Date.now()));
  const days = useMemo(() => stripDays(stripAnchor), [stripAnchor]);

  const centerOn = useCallback((date: number) => {
    const index = days.findIndex((day) => isSameDay(day, date));
    if (index < 0 || viewportWidth.current <= 0) return;

    const x = Math.max(
      0,
      space.lg + index * PILL_STRIDE + PILL_WIDTH / 2 - viewportWidth.current / 2
    );
    scrollRef.current?.scrollTo({ x, animated: false });
  }, [days]);

  const onLayout = (event: LayoutChangeEvent) => {
    viewportWidth.current = event.nativeEvent.layout.width;
    centerOn(selectedDate);
  };

  // Calendar picks outside the window shift the strip. Strip taps only change selection.
  useEffect(() => {
    if (days.some((day) => isSameDay(day, selectedDate))) return;
    setStripAnchor(startOfDay(selectedDate));
  }, [selectedDate, days]);

  useEffect(() => {
    if (viewportWidth.current <= 0) return;
    centerOn(selectedDate);
    // Only re-center when the strip window moves, not on every selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripAnchor]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      onLayout={onLayout}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {days.map((day) => (
        <DayPill
          key={day}
          day={day}
          selected={isSameDay(day, selectedDate)}
          today={isSameDay(day, Date.now())}
          onPress={() => onSelectDate(day)}
        />
      ))}
    </ScrollView>
  );
}

export const DATE_STRIP_HEIGHT = metrics.dateStripHeight;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    gap: PILL_GAP,
  },
  pill: {
    width: PILL_WIDTH,
    height: metrics.dateStripHeight,
  },
  pillInner: {
    flex: 1,
    borderRadius: space.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xs,
  },
  dayNum: {
    ...typography.caption,
    fontSize: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  todayDot: {
    position: "absolute",
    bottom: space.xs,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
