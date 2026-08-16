import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography, FONT_SIZE } from "@/theme/typography";
import {
  addMonths,
  formatMonthYear,
  isSameMonth,
  monthOffset,
  startOfMonth,
} from "@/shared/utils/dates";
import { Sheet } from "@/shared/components/Sheet";
import { ThemedText } from "@/shared/components/ThemedText";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 6;
const BATCH = 36;
const CENTER = 10_000;

interface MonthPickerProps {
  visible: boolean;
  selectedMonth: number;
  top: number;
  entryMonths?: Set<number>;
  onSelect: (monthTs: number) => void;
  onClose: () => void;
}

function monthForIndex(anchor: number, index: number): number {
  return addMonths(anchor, index - CENTER);
}

function indexForMonth(anchor: number, monthTs: number): number {
  return CENTER + monthOffset(anchor, monthTs);
}

/** Month-only list with bidirectional infinite scroll. */
export function MonthPicker({
  visible,
  selectedMonth,
  top,
  entryMonths,
  onSelect,
  onClose,
}: MonthPickerProps) {
  const { colors } = useTheme().theme;
  const anchor = startOfMonth(Date.now());
  const listRef = useRef<FlatList<number>>(null);
  const loadingFuture = useRef(false);

  const [range, setRange] = useState({ before: BATCH, after: BATCH });

  useEffect(() => {
    if (!visible) {
      setRange({ before: BATCH, after: BATCH });
      return;
    }
    const off = monthOffset(anchor, selectedMonth);
    setRange({
      after: Math.max(BATCH, off > 0 ? off + BATCH : BATCH),
      before: Math.max(BATCH, off < 0 ? -off + BATCH : BATCH),
    });
  }, [visible, selectedMonth, anchor]);

  const indices = useMemo(() => {
    const list: number[] = [];
    for (let i = CENTER + range.after; i >= CENTER - range.before; i -= 1) {
      list.push(i);
    }
    return list;
  }, [range]);

  const selectedIndex = indices.indexOf(indexForMonth(anchor, selectedMonth));

  const pick = (monthTs: number) => {
    onSelect(monthTs);
    onClose();
  };

  const loadPast = () => {
    setRange((r) => ({ ...r, before: r.before + BATCH }));
  };

  const loadFuture = () => {
    if (loadingFuture.current) return;
    loadingFuture.current = true;
    setRange((r) => ({ ...r, after: r.after + BATCH }));
    requestAnimationFrame(() => {
      loadingFuture.current = false;
    });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < ROW_HEIGHT * 2) {
      loadFuture();
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      placement="top"
      sheetStyle={[styles.sheet, { marginTop: top }]}
    >
      <View style={styles.headerRow}>
        <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
          Month
        </ThemedText>

        <Pressable
          onPress={() => pick(anchor)}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.resetBtn, pressed && press]}
          accessibilityLabel="Back to current month"
        >
          <Feather name="rotate-ccw" size={metrics.iconXs} color={colors.textSecondary} />
          <ThemedText weight="medium" style={[styles.resetLabel, { color: colors.textSecondary }]}>
            Current
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={indices}
        keyExtractor={(index) => String(index)}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        initialScrollIndex={selectedIndex > 0 ? selectedIndex : undefined}
        onScrollToIndexFailed={() => {}}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        onEndReached={loadPast}
        onEndReachedThreshold={0.4}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: monthIndex }) => {
          const monthTs = monthForIndex(anchor, monthIndex);
          const selected = isSameMonth(monthTs, selectedMonth);
          const hasEntries = entryMonths?.has(monthTs);

          return (
            <Pressable
              onPress={() => pick(monthTs)}
              style={({ pressed }) => [styles.row, pressed && press]}
              accessibilityLabel={formatMonthYear(monthTs)}
              accessibilityState={{ selected }}
            >
              <ThemedText
                weight={selected ? "semibold" : "regular"}
                style={[
                  typography.settingLabel,
                  { color: selected ? colors.text : colors.textSecondary },
                ]}
              >
                {formatMonthYear(monthTs)}
              </ThemedText>

              {hasEntries && !selected ? (
                <View style={[styles.dot, { backgroundColor: colors.marker }]} />
              ) : null}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: 264,
    paddingTop: space.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.xs,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    lineHeight: 22,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  resetLabel: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  list: {
    height: ROW_HEIGHT * VISIBLE_ROWS,
    flexGrow: 0,
    marginBottom: space.xs,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
