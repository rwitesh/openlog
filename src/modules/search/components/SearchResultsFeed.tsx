import { FlatList, StyleSheet, View } from "react-native";
import { ThemedText } from "@/shared/components/ThemedText";
import type { EntrySearchResult } from "@/shared/types";
import { space, useTheme } from "@/theme";
import { SearchResultRow } from "./SearchResultRow";

const MIN_QUERY_LENGTH = 2;

interface SearchResultsFeedProps {
  results: EntrySearchResult[];
  query: string;
  searching: boolean;
  paddingTop?: number;
  bottomInset: number;
  onOpenEntry: (entryId: string) => void;
}

/** Scrollable list of full-text search hits with an inline empty state. */
export function SearchResultsFeed({
  results,
  query,
  searching,
  paddingTop = 0,
  bottomInset,
  onOpenEntry,
}: SearchResultsFeedProps) {
  const { theme } = useTheme();
  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return (
      <View style={[styles.empty, { paddingTop, paddingBottom: bottomInset }]}>
        <ThemedText
          weight="semibold"
          style={[theme.typography.emptyTitle, { color: theme.colors.text }]}
        >
          Search your memories
        </ThemedText>
        <ThemedText style={[theme.typography.emptyBody, { color: theme.colors.textSecondary }]}>
          Find moments by any word or place you&apos;ve written.
        </ThemedText>
      </View>
    );
  }

  if (!results.length && !searching) {
    return (
      <View style={[styles.empty, { paddingTop, paddingBottom: bottomInset }]}>
        <ThemedText
          weight="semibold"
          style={[theme.typography.emptyTitle, { color: theme.colors.text }]}
        >
          No moments found
        </ThemedText>
        <ThemedText style={[theme.typography.emptyBody, { color: theme.colors.textSecondary }]}>
          {`Nothing matches \u201C${trimmed}\u201D. Try another word or place.`}
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={results}
      keyExtractor={(item) => item.entry.id}
      renderItem={({ item }) => <SearchResultRow result={item} onOpen={onOpenEntry} />}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: theme.colors.separator }]} />
      )}
      contentContainerStyle={[
        styles.content,
        { paddingTop, paddingBottom: bottomInset + space.xxl },
      ]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={searching ? <View /> : null}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.xl,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
    gap: space.xs + 2,
  },
});
