import { useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { usePreferences, useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";
import { DEFAULT_FONT_FAMILY } from "@/theme/typography";
import { fontManager, getFonts, type FontName } from "@/services/fonts";

/**
 * Typography editor: curated typeface catalog. Text size lives in
 * Accessibility; downloaded & active fonts list first, on-demand below.
 */
export function TypographySection() {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const { appearance } = preferences;

  const selectedFont = appearance.fontFamily || DEFAULT_FONT_FAMILY;

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFont, setLoadingFont] = useState<string | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);

  const allFonts = useMemo(() => getFonts(), []);

  const filteredFonts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allFonts;
    return allFonts.filter((f) => f.toLowerCase().includes(q));
  }, [allFonts, searchQuery]);

  // Partition filtered fonts into Downloaded (top) vs Explore (on-demand)
  const { downloadedFonts, availableFonts } = useMemo(() => {
    // Reference cacheVersion to invalidate when fonts are added/removed
    void cacheVersion;
    const downloaded: FontName[] = [];
    const available: FontName[] = [];

    for (const fontName of filteredFonts) {
      if (fontName === DEFAULT_FONT_FAMILY || fontManager.isCached(fontName)) {
        downloaded.push(fontName);
      } else {
        available.push(fontName);
      }
    }

    return { downloadedFonts: downloaded, availableFonts: available };
  }, [filteredFonts, cacheVersion]);

  const handleSelect = useCallback(
    async (fontName: FontName) => {
      if (fontName === selectedFont) {
        return;
      }

      setLoadingFont(fontName);

      try {
        const result = await fontManager.load(fontName);
        if (result.success) {
          setAppearance({ fontFamily: fontName });
          setCacheVersion((v) => v + 1);
        } else {
          Alert.alert(
            "Font Download Failed",
            result.error ||
              `Unable to download "${fontName}". Please check your internet connection and try again.`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error loading font.";
        Alert.alert("Font Download Failed", message);
      } finally {
        setLoadingFont(null);
      }
    },
    [selectedFont, setAppearance]
  );

  const handleDelete = useCallback(
    (fontName: FontName) => {
      Alert.alert(
        "Delete Cached Font?",
        `Remove "${fontName}" from your device storage?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await fontManager.remove(fontName);
              setCacheVersion((v) => v + 1);
              if (fontName === selectedFont) {
                setAppearance({ fontFamily: DEFAULT_FONT_FAMILY });
              }
            },
          },
        ]
      );
    },
    [selectedFont, setAppearance]
  );

  const renderFontRow = (fontName: FontName, isDownloaded: boolean) => {
    const isSelected = fontName === selectedFont;
    const isLoading = loadingFont === fontName;
    const isBundledDefault = fontName === DEFAULT_FONT_FAMILY;

    return (
      <Pressable
        key={fontName}
        onPress={() => handleSelect(fontName)}
        disabled={loadingFont !== null}
        style={({ pressed }) => [
          styles.fontRow,
          {
            backgroundColor: isSelected ? colors.surface : colors.surfaceMuted,
            borderColor: isSelected ? colors.accent : colors.separator,
          },
          isSelected && styles.fontRowSelected,
          pressed && press,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${fontName}${isDownloaded ? ", downloaded" : ", tap to download"}`}
      >
        <View style={styles.fontRowLeft}>
          <ThemedText
            weight={isSelected ? "semibold" : "medium"}
            style={[styles.fontRowName, { color: colors.text }]}
          >
            {fontName}
          </ThemedText>
          {isBundledDefault ? (
            <View style={[styles.defaultPill, { borderColor: colors.separator }]}>
              <ThemedText style={[styles.defaultPillText, { color: colors.textSecondary }]}>
                Default
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.fontRowRight}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <View style={styles.actionRow}>
              {isDownloaded && !isBundledDefault ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(fontName);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [styles.deleteButton, pressed && press]}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${fontName}`}
                >
                  <Feather name="trash-2" size={14} color={colors.textTertiary} />
                </Pressable>
              ) : null}

              {!isDownloaded ? (
                <View style={styles.iconWrap}>
                  <Feather name="download-cloud" size={15} color={colors.textTertiary} />
                </View>
              ) : null}

              {isSelected ? (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Feather name="check" size={11} color={isDark ? "#121215" : "#FAF8F5"} />
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.separator,
          },
        ]}
      >
        <Feather name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search fonts..."
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={6}>
            <Feather name="x-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Section 1: Downloaded */}
      {downloadedFonts.length > 0 ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              DOWNLOADED
            </ThemedText>
            <ThemedText style={[styles.sectionCount, { color: colors.textTertiary }]}>
              {downloadedFonts.length}
            </ThemedText>
          </View>

          <View style={styles.list}>
            {downloadedFonts.map((fontName) => renderFontRow(fontName, true))}
          </View>
        </View>
      ) : null}

      {/* Section 2: Available */}
      {availableFonts.length > 0 ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              AVAILABLE
            </ThemedText>
            <ThemedText style={[styles.sectionCount, { color: colors.textTertiary }]}>
              {availableFonts.length}
            </ThemedText>
          </View>

          <View style={styles.list}>
            {availableFonts.map((fontName) => renderFontRow(fontName, false))}
          </View>
        </View>
      ) : null}

      {/* Empty Search State */}
      {!downloadedFonts.length && !availableFonts.length ? (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            No fonts matching &quot;{searchQuery}&quot;
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.md - 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sectionBlock: {
    gap: space.xs + 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: 11,
  },
  list: {
    gap: 6,
  },
  fontRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fontRowSelected: {
    borderWidth: 1.5,
  },
  fontRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    flex: 1,
  },
  fontRowName: {
    fontSize: 14,
    lineHeight: 18,
  },
  defaultPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  defaultPillText: {
    fontSize: 10,
    lineHeight: 12,
  },
  fontRowRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 28,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xxl,
  },
  emptyText: {
    fontSize: 14,
  },
});
