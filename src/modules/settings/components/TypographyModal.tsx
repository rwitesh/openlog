import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { usePreferences, useTheme } from "@/theme";
import type { TextSize } from "@/theme/typography";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";
import { fontManager, getFonts, type FontName } from "@/services/fonts";
import { SettingsBottomSheet } from "./SettingsBottomSheet";
import { SegmentedRow } from "./SegmentedRow";

interface TypographyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TypographyModal({ visible, onClose }: TypographyModalProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const { appearance } = preferences;

  const selectedFont = appearance.fontFamily || "Source Sans 3";
  const selectedTextSize = appearance.textSize;

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFont, setLoadingFont] = useState<string | null>(null);
  const [, setCacheVersion] = useState(0);

  const allFonts = useMemo(() => getFonts(), []);

  const filteredFonts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allFonts;
    return allFonts.filter((f) => f.toLowerCase().includes(q));
  }, [allFonts, searchQuery]);

  const handleSelect = async (fontName: FontName) => {
    if (fontName === selectedFont) {
      return;
    }

    setLoadingFont(fontName);

    try {
      const result = await fontManager.load(fontName);
      if (result.success) {
        setAppearance({ fontFamily: fontName });
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
  };

  const handleDelete = (fontName: FontName) => {
    Alert.alert(
      "Delete Cached Font?",
      `Remove "${fontName}" from your device?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await fontManager.remove(fontName);
            setCacheVersion((v) => v + 1);
            if (fontName === selectedFont) {
              setAppearance({ fontFamily: "Source Sans 3" });
            }
          },
        },
      ]
    );
  };

  return (
    <SettingsBottomSheet
      visible={visible}
      onClose={onClose}
      title="Typography"
      scrollable={false}
    >
      <View style={styles.container}>
        {/* Text Scale Selection */}
        <View style={styles.scaleSection}>
          <SegmentedRow<TextSize>
            items={[
              { id: "compact", label: "Compact" },
              { id: "regular", label: "Regular" },
              { id: "generous", label: "Generous" },
            ]}
            selected={selectedTextSize}
            onSelect={(t) => setAppearance({ textSize: t })}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
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
              placeholder="Search typefaces..."
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
        </View>

        {/* Font List */}
        <FlatList
          data={filteredFonts}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: fontName }) => {
            const isSelected = fontName === selectedFont;
            const isLoading = loadingFont === fontName;
            const isCached = fontManager.isCached(fontName);
            const isBundledDefault = fontName === "Source Sans 3";

            return (
              <Pressable
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
              >
                <ThemedText
                  weight={isSelected ? "semibold" : "regular"}
                  style={[styles.fontRowName, { color: colors.text }]}
                >
                  {fontName}
                </ThemedText>

                <View style={styles.fontRowRight}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <View style={styles.actionRow}>
                      {isCached && !isBundledDefault ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(fontName);
                          }}
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.deleteButton,
                            pressed && press,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete cached font ${fontName}`}
                        >
                          <Feather name="trash-2" size={14} color={colors.textTertiary} />
                        </Pressable>
                      ) : null}

                      {!isCached && !isBundledDefault ? (
                        <View style={styles.iconWrap}>
                          <Feather name="download-cloud" size={14} color={colors.textTertiary} />
                        </View>
                      ) : null}

                      {isSelected ? (
                        <View
                          style={[
                            styles.checkBadge,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Feather
                            name="check"
                            size={11}
                            color={theme.mode === "dark" ? "#121215" : "#FAF8F5"}
                          />
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                No typefaces found matching "{searchQuery}"
              </ThemedText>
            </View>
          }
        />
      </View>
    </SettingsBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: space.sm + 2,
  },
  scaleSection: {},
  searchContainer: {},
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
  listContent: {
    paddingBottom: space.xl,
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
  fontRowName: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
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
