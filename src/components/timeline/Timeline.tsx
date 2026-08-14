import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import type { Entry } from "@/types/entry";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { isSameDay, toTimelineItems } from "@/lib";
import { ThemedText } from "@/components/core/ui";
import { Row } from "@/components/entry/Row";
import { Rail } from "./Rail";

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

export function Timeline({
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

  const items = useMemo(
    () => toTimelineItems(entries, showDates),
    [entries, showDates]
  );

  if (!items.length) {
    return (
      <View style={[styles.empty, { paddingTop, paddingBottom: bottomInset }]}>
        <ThemedText
          weight="medium"
          style={[typography.emptyTitle, { color: theme.colors.textSecondary }]}
        >
          {emptyTitle}
        </ThemedText>
        <ThemedText style={[typography.emptyBody, { color: theme.colors.textTertiary }]}>
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
        <Rail
          dayTs={item.dayTs}
          showDate={item.showDate}
          isFirst={index === 0}
          isLast={item.isLast}
          onMarkerPress={onOpenDay ? () => onOpenDay(item.dayTs) : undefined}
        >
          <Row
            entry={item.entry}
            animate={
              animateFirst &&
              index === 0 &&
              isSameDay(item.entry.createdAt, Date.now())
            }
          />
        </Rail>
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
    paddingLeft: space.md,
    paddingRight: space.xl,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
    gap: space.sm,
  },
});
