import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { EntrySearchResult } from "@/shared/types";
import { useEntryPreferences, useTheme } from "@/theme";
import { press } from "@/theme/motion";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatSearchWhen } from "@/shared/utils/dates";
import { locationPlaceTitle } from "@/services/location/location";
import { entryContentTypeLabel } from "@/modules/entry";
import { ThemedText } from "@/shared/components/ThemedText";
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
  const locationMatched = hasSnippetMatch(locationSnippet);
  const showLocation = locationPref && Boolean(entry.location);

  return (
    <Pressable
      onPress={() => onOpen(entry.id)}
      style={({ pressed }) => [styles.row, pressed && press]}
      accessibilityLabel="Open moment"
      accessibilityRole="button"
    >
      <View style={styles.metaRow}>
        <ThemedText
          weight="medium"
          style={[styles.metaText, { color: colors.textSecondary }]}
        >
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

      {hasText ? (
        <SearchHighlight snippet={snippet} numberOfLines={3} />
      ) : (
        <ThemedText
          style={[styles.fallback, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {entryContentTypeLabel(entry)}
        </ThemedText>
      )}
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
});
