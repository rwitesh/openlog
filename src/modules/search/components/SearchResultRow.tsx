import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { entryContentTypeLabel, TagChip } from "@/modules/entry";
import { locationPlaceTitle } from "@/services/location/location";
import { ThemedText } from "@/shared/components/ThemedText";
import type { EntrySearchResult } from "@/shared/types";
import { formatSearchWhen } from "@/shared/utils/dates";
import { press, space, typography, useEntryPreferences, useTheme } from "@/theme";
import { hasSnippetMatch } from "../utils/highlight";
import { SearchHighlight } from "./SearchHighlight";

interface SearchResultRowProps {
  result: EntrySearchResult;
  onOpen: (entryId: string) => void;
}

function SearchResultRowBase({ result, onOpen }: SearchResultRowProps) {
  const { theme } = useTheme();
  const { showLocation: locationPref } = useEntryPreferences();
  const { colors } = theme;
  const { entry, snippet, locationSnippet } = result;

  const hasText = Boolean(entry.text?.trim());
  const textMatched = hasSnippetMatch(snippet);
  const locationMatched = hasSnippetMatch(locationSnippet);
  const showLocation = locationPref && Boolean(entry.location);

  return (
    <Pressable
      onPress={() => onOpen(entry.id)}
      style={({ pressed }) => [styles.row, pressed && press]}
      accessibilityLabel="Open entry"
      accessibilityRole="button"
    >
      <View style={styles.metaRow}>
        <ThemedText weight="medium" style={[styles.metaText, { color: colors.textSecondary }]}>
          {formatSearchWhen(entry.createdAt)}
        </ThemedText>

        {showLocation ? (
          locationMatched ? (
            <SearchHighlight snippet={locationSnippet} variant="meta" numberOfLines={1} />
          ) : (
            <ThemedText
              style={[styles.metaText, styles.locationText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {locationPlaceTitle(entry.location)}
            </ThemedText>
          )
        ) : null}
      </View>

      {hasText && textMatched ? (
        <SearchHighlight snippet={snippet} numberOfLines={3} />
      ) : hasText ? (
        <ThemedText style={[styles.preview, { color: colors.text }]} numberOfLines={3}>
          {entry.text}
        </ThemedText>
      ) : (
        <ThemedText style={[styles.fallback, { color: colors.textSecondary }]} numberOfLines={1}>
          {entryContentTypeLabel(entry)}
        </ThemedText>
      )}

      {entry.tags.length ? (
        <View style={styles.tags}>
          {entry.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export const SearchResultRow = memo(SearchResultRowBase);

const styles = StyleSheet.create({
  row: {
    paddingVertical: space.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.xs + 2,
    marginBottom: space.xs + 2,
  },
  metaText: {
    fontSize: typography.timestamp.fontSize,
    lineHeight: typography.timestamp.lineHeight,
    letterSpacing: typography.timestamp.letterSpacing,
  },
  locationText: {
    flexShrink: 1,
    letterSpacing: 0,
  },
  fallback: {
    fontSize: typography.entryText.fontSize,
    lineHeight: typography.entryText.lineHeight,
    letterSpacing: typography.entryText.letterSpacing,
  },
  preview: {
    fontSize: typography.entryText.fontSize,
    lineHeight: typography.entryText.lineHeight,
    letterSpacing: typography.entryText.letterSpacing,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs + 2,
    marginTop: space.sm,
  },
});
