import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";
import { fontManager, getFonts, type FontName } from "@/services/fonts";

interface FontPickerModalProps {
  visible: boolean;
  selectedFont: FontName;
  onSelectFont: (fontName: FontName) => void;
  onClose: () => void;
}

export function FontPickerModal({
  visible,
  selectedFont,
  onSelectFont,
  onClose,
}: FontPickerModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;

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
        onSelectFont(fontName);
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
      `Remove the downloaded font file for "${fontName}" from your device?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await fontManager.remove(fontName);
            setCacheVersion((v) => v + 1);
            if (fontName === selectedFont) {
              onSelectFont("Source Sans 3");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top || space.md,
            paddingBottom: insets.bottom || space.md,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.separator }]}>
          <View style={styles.headerLeft}>
            <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
              Select Font
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {allFonts.length} typography styles
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.surfaceMuted },
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close font picker"
          >
            <Feather name="x" size={18} color={colors.text} />
          </Pressable>
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
              placeholder="Search fonts by name..."
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
                    backgroundColor: isSelected ? colors.surface : "transparent",
                    borderColor: isSelected ? colors.separator : "transparent",
                  },
                  pressed && press,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.fontRowContent}>
                  <ThemedText
                    weight={isSelected ? "semibold" : "regular"}
                    style={[
                      styles.fontRowName,
                      { color: colors.text },
                    ]}
                  >
                    {fontName}
                  </ThemedText>
                </View>

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
                          <Feather name="trash-2" size={15} color={colors.textTertiary} />
                        </Pressable>
                      ) : null}

                      {!isCached && !isBundledDefault ? (
                        <View style={styles.iconWrap}>
                          <Feather name="download-cloud" size={15} color={colors.textTertiary} />
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
                No fonts found matching "{searchQuery}"
              </ThemedText>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
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
  listContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    paddingTop: space.xs,
    gap: 4,
  },
  fontRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm + 4,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fontRowContent: {
    flex: 1,
  },
  fontRowName: {
    fontSize: 15,
    lineHeight: 20,
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xxl,
  },
  emptyText: {
    fontSize: 14,
  },
});
