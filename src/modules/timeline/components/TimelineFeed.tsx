import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { EntryRow } from "@/modules/entry";
import { ThemedText } from "@/shared/components/ThemedText";
import type { Entry } from "@/shared/types";
import { isSameDay } from "@/shared/utils/dates";
import { space, typography, useTheme } from "@/theme";
import { toTimelineItems } from "../utils/TimelineTransform";
import { TimelineRail } from "./TimelineRail";

interface TimelineProps {
  entries: Entry[];
  showDates?: boolean;
  paddingTop?: number;
  bottomInset: number;
  emptyTitle: string;
  emptyBody: string;
  animateFirst?: boolean;
  onOpenDay?: (dayTs: number) => void;
}

export function TimelineFeed({
  entries,
  showDates = false,
  paddingTop = 0,
  bottomInset,
  emptyTitle,
  emptyBody,
  animateFirst = false,
  onOpenDay,
}: TimelineProps) {
  const { theme } = useTheme();

  const items = useMemo(() => toTimelineItems(entries, showDates), [entries, showDates]);

  if (!items.length) {
    return (
      <View style={[styles.empty, { paddingTop, paddingBottom: bottomInset }]}>
        <ThemedText
          weight="semibold"
          style={[typography.emptyTitle, { color: theme.colors.text }]}
        >
          {emptyTitle}
        </ThemedText>
        <ThemedText style={[typography.emptyBody, { color: theme.colors.textSecondary }]}>
          {emptyBody}
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.entry.id}
      renderItem={({ item, index }) => (
        <TimelineRail
          dayTs={item.dayTs}
          showDate={item.showDate}
          isFirst={index === 0}
          isLast={item.isLast}
          onMarkerPress={onOpenDay ? () => onOpenDay(item.dayTs) : undefined}
        >
          <EntryRow
            entry={item.entry}
            animate={animateFirst && index === 0 && isSameDay(item.entry.createdAt, Date.now())}
          />
        </TimelineRail>
      )}
      contentContainerStyle={[
        styles.content,
        { paddingTop, paddingBottom: bottomInset + space.xxl },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingLeft: space.lg,
    paddingRight: space.xxl,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
    gap: space.xs + 2,
  },
});
