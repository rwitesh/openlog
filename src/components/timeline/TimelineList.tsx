import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { FlatList, StyleSheet, View, type ListRenderItem } from "react-native";

import type { Entry } from "@/types/entry";
import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { entriesForDay, formatHeaderDate, isSameDay } from "@/lib";
import { ThemedText } from "@/components/core";
import { Row } from "@/components/entry";

export interface TimelineListHandle {
  scrollToTop: () => void;
}

interface TimelineListProps {
  entries: Entry[];
  selectedDate: number;
  headerHeight: number;
  bottomInset: number;
}

export const TimelineList = forwardRef<TimelineListHandle, TimelineListProps>(
  function TimelineList({ entries, selectedDate, headerHeight, bottomInset }, ref) {
    const { theme } = useTheme();
    const listRef = useRef<FlatList<Entry>>(null);

    const dayEntries = useMemo(
      () => entriesForDay(entries, selectedDate),
      [entries, selectedDate]
    );

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop() {
          if (!dayEntries.length) return;
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        },
      }),
      [dayEntries.length]
    );

    const renderItem: ListRenderItem<Entry> = useCallback(
      ({ item, index }) => (
        <Row
          entry={item}
          isFirst={index === 0}
          isLast={index === dayEntries.length - 1}
          animate={index === 0 && isSameDay(item.createdAt, Date.now())}
        />
      ),
      [dayEntries.length]
    );

    const keyExtractor = useCallback((item: Entry) => item.id, []);

    const contentContainerStyle = useMemo(
      () => ({
        paddingTop: headerHeight,
        paddingBottom: bottomInset + space.xxl,
        paddingHorizontal: space.xl,
      }),
      [bottomInset, headerHeight]
    );

    if (!dayEntries.length) {
      return (
        <View
          style={[
            styles.empty,
            { paddingTop: headerHeight + space.xxxl, paddingBottom: bottomInset },
          ]}
        >
          <ThemedText
            weight="medium"
            style={[typography.emptyTitle, { color: theme.colors.textSecondary }]}
          >
            A quiet day
          </ThemedText>
          <ThemedText style={[typography.emptyBody, { color: theme.colors.textTertiary }]}>
            {formatHeaderDate(selectedDate)} is still open. Tap + to write.
          </ThemedText>
        </View>
      );
    }

    return (
      <FlatList
        ref={listRef}
        style={styles.list}
        data={dayEntries}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews
        initialNumToRender={8}
        windowSize={7}
      />
    );
  }
);

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
    gap: space.sm,
  },
});
