import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { TagChip } from "@/modules/entry";
import { ThemedText } from "@/shared/components/ThemedText";
import type { EntrySearchResult, TagSummary } from "@/shared/types";
import { space, useTheme } from "@/theme";
import { SearchResultRow } from "./SearchResultRow";

const MIN_QUERY_LENGTH = 2;

interface SearchResultsFeedProps {
  results: EntrySearchResult[];
  query: string;
  /** The query the current results were fetched for. */
  resultsQuery: string;
  /** Every tag, alphabetical; browsed before typing and narrowed while typing. */
  tags: TagSummary[];
  searching: boolean;
  paddingTop?: number;
  bottomInset: number;
  onOpenEntry: (entryId: string) => void;
  onOpenTag: (tagId: string) => void;
}

interface TagListProps {
  title: string;
  tags: TagSummary[];
  onOpenTag: (tagId: string) => void;
}

function TagList({ title, tags, onOpenTag }: TagListProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.tagSection}>
      <ThemedText
        weight="semibold"
        style={[styles.tagTitle, { color: theme.colors.textSecondary }]}
      >
        {title}
      </ThemedText>
      <View style={styles.tagList}>
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            count={tag.entryCount}
            onPress={() => onOpenTag(tag.id)}
          />
        ))}
      </View>
    </View>
  );
}

/** Scrollable list of full-text search hits with an inline empty state. */
export function SearchResultsFeed({
  results,
  query,
  resultsQuery,
  tags,
  searching,
  paddingTop = 0,
  bottomInset,
  onOpenEntry,
  onOpenTag,
}: SearchResultsFeedProps) {
  const { theme } = useTheme();
  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH && tags.length) {
    return (
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          { paddingTop, paddingBottom: bottomInset + space.xxl },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedText
          style={[theme.typography.emptyBody, styles.hint, { color: theme.colors.textSecondary }]}
        >
          Find entries by text, place, or tag.
        </ThemedText>
        <TagList title="Tags" tags={tags} onOpenTag={onOpenTag} />
      </ScrollView>
    );
  }

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return (
      <View style={[styles.empty, { paddingTop, paddingBottom: bottomInset }]}>
        <ThemedText
          weight="semibold"
          style={[theme.typography.emptyTitle, { color: theme.colors.text }]}
        >
          Search your timeline
        </ThemedText>
        <ThemedText style={[theme.typography.emptyBody, { color: theme.colors.textSecondary }]}>
          Find entries by text, place, or tag.
        </ThemedText>
      </View>
    );
  }

  const needle = trimmed.toLocaleLowerCase();
  const matchingTags = tags.filter((tag) => tag.name.toLocaleLowerCase().includes(needle));

  if (!results.length && !searching && !matchingTags.length) {
    return (
      <View style={[styles.empty, { paddingTop, paddingBottom: bottomInset }]}>
        <ThemedText
          weight="semibold"
          style={[theme.typography.emptyTitle, { color: theme.colors.text }]}
        >
          No entries found
        </ThemedText>
        <ThemedText style={[theme.typography.emptyBody, { color: theme.colors.textSecondary }]}>
          {`Nothing matches \u201C${trimmed}\u201D. Try another word, place, or tag.`}
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={results}
      keyExtractor={(item) => item.entry.id}
      renderItem={({ item }) => (
        <SearchResultRow
          result={item}
          query={resultsQuery}
          onOpen={onOpenEntry}
          onOpenTag={onOpenTag}
        />
      )}
      ListHeaderComponent={
        matchingTags.length ? (
          <TagList title="Matching tags" tags={matchingTags} onOpenTag={onOpenTag} />
        ) : null
      }
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
  hint: {
    marginBottom: space.lg,
  },
  tagSection: {
    gap: space.sm,
    paddingBottom: space.md,
  },
  tagTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
    gap: space.xs + 2,
  },
});
