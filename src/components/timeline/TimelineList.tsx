import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { FlatList, StyleSheet, View, type ListRenderItem } from "react-native";

import type { Entry } from "@/types/entry";
import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { entriesForDay, formatHeaderDate, isSameDay } from "@/lib";
import { ThemedText } from "@/components/core";
import { EntryRow } from "@/components/entry";

export interface TimelineListHandle {
  scrollToEnd: () => void;
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
        scrollToEnd() {
          if (!dayEntries.length) return;
          listRef.current?.scrollToEnd({ animated: true });
        },
      }),
      [dayEntries.length]
    );

    const renderItem: ListRenderItem<Entry> = useCallback(
      ({ item, index }) => (
        <EntryRow
          entry={item}
          isLast={index === dayEntries.length - 1}
          animate={index === dayEntries.length - 1 && isSameDay(item.createdAt, Date.now())}
        />
      ),
      [dayEntries.length]
    );

    const keyExtractor = useCallback((item: Entry) => item.id, []);

    const contentContainerStyle = useMemo(
      () => ({
        paddingTop: headerHeight + space.xl,
        paddingBottom: bottomInset + space.xxl,
        paddingHorizontal: space.xxl,
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
          <ThemedText style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>
            Nothing here yet
          </ThemedText>
          <ThemedText style={[styles.emptyBody, { color: theme.colors.textTertiary }]}>
            {formatHeaderDate(selectedDate)} is still open. Tap + to add an entry.
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
    paddingHorizontal: space.xl + space.xl,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: space.md,
  },
  emptyBody: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
  },
});
