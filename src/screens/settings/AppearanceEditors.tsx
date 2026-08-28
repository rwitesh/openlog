import { Feather } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import {
  LiveThemePreview,
  SegmentedRow,
  SettingsEditorScreen,
  ToggleRow,
} from "@/modules/settings";
import { fontManager, getFonts } from "@/services/fonts";
import { ThemedText } from "@/shared/components/ThemedText";
import {
  ACCENT_OPTIONS,
  DEFAULT_DARK_THEME,
  DEFAULT_FONT_FAMILY,
  DEFAULT_LIGHT_THEME,
  type FontName,
  press,
  radius,
  space,
  type ThemeMode,
  type TimelineDensity,
  type TimelineStyle,
  usePreferences,
  useTheme,
} from "@/theme";

interface ThemeOptionItem {
  id: ThemeMode;
  title: string;
  subtitle: string;
  swatchBg: string;
  swatchText: string;
  swatchSurface: string;
  swatchTextSecondary: string;
}

const THEME_OPTIONS: ThemeOptionItem[] = [
  {
    id: "light",
    title: "Light",
    subtitle: "Washi Linen",
    swatchBg: DEFAULT_LIGHT_THEME.background,
    swatchText: DEFAULT_LIGHT_THEME.text,
    swatchSurface: DEFAULT_LIGHT_THEME.surface,
    swatchTextSecondary: DEFAULT_LIGHT_THEME.textSecondary,
  },
  {
    id: "dark",
    title: "Dark",
    subtitle: "Nocturne Warm",
    swatchBg: DEFAULT_DARK_THEME.background,
    swatchText: DEFAULT_DARK_THEME.text,
    swatchSurface: DEFAULT_DARK_THEME.surface,
    swatchTextSecondary: DEFAULT_DARK_THEME.textSecondary,
  },
  {
    id: "system",
    title: "System",
    subtitle: "Match Device",
    swatchBg: "transparent",
    swatchText: DEFAULT_LIGHT_THEME.text,
    swatchSurface: "transparent",
    swatchTextSecondary: DEFAULT_LIGHT_THEME.textSecondary,
  },
];

export function ThemeSettingsScreen() {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const currentMode = preferences.appearance.mode;

  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <View style={themeStyles.list}>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = currentMode === opt.id;

          return (
            <Pressable
              key={opt.id}
              onPress={() => setAppearance({ mode: opt.id })}
              style={({ pressed }) => [
                themeStyles.optionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isSelected ? colors.accent : colors.separator,
                },
                isSelected && themeStyles.optionCardSelected,
                pressed && press,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${opt.title} theme`}
            >
              <View
                style={[
                  themeStyles.swatchBox,
                  {
                    backgroundColor:
                      opt.id === "system"
                        ? isDark
                          ? DEFAULT_DARK_THEME.background
                          : DEFAULT_LIGHT_THEME.background
                        : opt.swatchBg,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <View
                  style={[
                    themeStyles.miniCard,
                    {
                      backgroundColor:
                        opt.id === "system"
                          ? isDark
                            ? DEFAULT_DARK_THEME.surface
                            : DEFAULT_LIGHT_THEME.surface
                          : opt.swatchSurface,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <View
                    style={[
                      themeStyles.miniLinePrimary,
                      {
                        backgroundColor:
                          opt.id === "system"
                            ? isDark
                              ? DEFAULT_DARK_THEME.text
                              : DEFAULT_LIGHT_THEME.text
                            : opt.swatchText,
                      },
                    ]}
                  />
                  <View
                    style={[
                      themeStyles.miniLineSecondary,
                      {
                        backgroundColor:
                          opt.id === "system"
                            ? isDark
                              ? DEFAULT_DARK_THEME.textSecondary
                              : DEFAULT_LIGHT_THEME.textSecondary
                            : opt.swatchTextSecondary,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={themeStyles.textWrap}>
                <ThemedText weight="semibold" style={[themeStyles.title, { color: colors.text }]}>
                  {opt.title}
                </ThemedText>
                <ThemedText style={[themeStyles.subtitle, { color: colors.textSecondary }]}>
                  {opt.subtitle}
                </ThemedText>
              </View>

              <View
                style={[
                  themeStyles.radioDot,
                  {
                    borderColor: isSelected ? colors.accent : colors.textTertiary,
                    backgroundColor: isSelected ? colors.accent : "transparent",
                  },
                ]}
              >
                {isSelected ? <Feather name="check" size={11} color={colors.background} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </SettingsEditorScreen>
  );
}

const themeStyles = StyleSheet.create({
  list: {
    gap: space.sm + 2,
    paddingBottom: space.xs,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: space.md,
  },
  optionCardSelected: {
    borderWidth: 2,
  },
  swatchBox: {
    width: 52,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 5,
    justifyContent: "center",
  },
  miniCard: {
    flex: 1,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
    justifyContent: "center",
  },
  miniLinePrimary: {
    height: 3,
    width: "75%",
    borderRadius: 1.5,
  },
  miniLineSecondary: {
    height: 2.5,
    width: "50%",
    borderRadius: 1.25,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});

export function AccentSettingsScreen() {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const currentAccentId = preferences.appearance.accent;

  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <View style={accentStyles.grid}>
        {ACCENT_OPTIONS.map((item) => {
          const isSelected = currentAccentId === item.id;
          const color = isDark ? item.colorDark : item.colorLight;
          const isDefault = item.id === "default";

          return (
            <Pressable
              key={item.id}
              onPress={() => setAppearance({ accent: item.id })}
              style={({ pressed }) => [
                accentStyles.accentCard,
                {
                  backgroundColor: isSelected ? colors.surface : colors.surfaceMuted,
                  borderColor: isSelected ? color : colors.separator,
                },
                isSelected && accentStyles.accentCardSelected,
                pressed && press,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Accent color ${item.label}`}
            >
              <View style={accentStyles.accentCardLeft}>
                <View
                  style={[
                    accentStyles.colorSwatch,
                    {
                      backgroundColor: color,
                      borderWidth: isDefault ? 1 : 0,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  {isSelected ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                </View>

                <ThemedText
                  weight={isSelected ? "semibold" : "medium"}
                  style={[accentStyles.accentName, { color: colors.text }]}
                >
                  {item.label}
                </ThemedText>
              </View>

              {isSelected ? (
                <View style={[accentStyles.selectedIndicator, { backgroundColor: color }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </SettingsEditorScreen>
  );
}

const accentStyles = StyleSheet.create({
  grid: {
    gap: space.xs + 2,
    paddingBottom: space.xs,
  },
  accentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accentCardSelected: {
    borderWidth: 1.5,
  },
  accentCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md - 2,
    flex: 1,
  },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  accentName: {
    fontSize: 14,
    lineHeight: 18,
  },
  selectedIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export function TypographySettingsScreen() {
  const { theme } = useTheme();
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

  const { downloadedFonts, availableFonts } = useMemo(() => {
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
      Alert.alert("Delete Cached Font?", `Remove "${fontName}" from your device storage?`, [
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
      ]);
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
          typoStyles.fontRow,
          {
            backgroundColor: isSelected ? colors.surface : colors.surfaceMuted,
            borderColor: isSelected ? colors.accent : colors.separator,
          },
          isSelected && typoStyles.fontRowSelected,
          pressed && press,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${fontName}${isDownloaded ? ", downloaded" : ", tap to download"}`}
      >
        <View style={typoStyles.fontRowLeft}>
          <ThemedText
            weight={isSelected ? "semibold" : "medium"}
            style={[typoStyles.fontRowName, { color: colors.text }]}
          >
            {fontName}
          </ThemedText>
          {isBundledDefault ? (
            <View style={[typoStyles.defaultPill, { borderColor: colors.separator }]}>
              <ThemedText style={[typoStyles.defaultPillText, { color: colors.textSecondary }]}>
                Default
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={typoStyles.fontRowRight}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <View style={typoStyles.actionRow}>
              {isDownloaded && !isBundledDefault ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(fontName);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [typoStyles.deleteButton, pressed && press]}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${fontName}`}
                >
                  <Feather name="trash-2" size={14} color={colors.textTertiary} />
                </Pressable>
              ) : null}

              {!isDownloaded ? (
                <View style={typoStyles.iconWrap}>
                  <Feather name="download-cloud" size={15} color={colors.textTertiary} />
                </View>
              ) : null}

              {isSelected ? (
                <View style={[typoStyles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Feather name="check" size={11} color={colors.background} />
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <View style={typoStyles.container}>
        <View
          style={[
            typoStyles.searchBar,
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
            style={[typoStyles.searchInput, { color: colors.text }]}
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

        {downloadedFonts.length > 0 ? (
          <View style={typoStyles.sectionBlock}>
            <View style={typoStyles.sectionHeaderRow}>
              <ThemedText
                weight="medium"
                style={[typoStyles.sectionTitle, { color: colors.textSecondary }]}
              >
                DOWNLOADED
              </ThemedText>
              <ThemedText style={[typoStyles.sectionCount, { color: colors.textTertiary }]}>
                {downloadedFonts.length}
              </ThemedText>
            </View>

            <View style={typoStyles.list}>
              {downloadedFonts.map((fontName) => renderFontRow(fontName, true))}
            </View>
          </View>
        ) : null}

        {availableFonts.length > 0 ? (
          <View style={typoStyles.sectionBlock}>
            <View style={typoStyles.sectionHeaderRow}>
              <ThemedText
                weight="medium"
                style={[typoStyles.sectionTitle, { color: colors.textSecondary }]}
              >
                AVAILABLE
              </ThemedText>
              <ThemedText style={[typoStyles.sectionCount, { color: colors.textTertiary }]}>
                {availableFonts.length}
              </ThemedText>
            </View>

            <View style={typoStyles.list}>
              {availableFonts.map((fontName) => renderFontRow(fontName, false))}
            </View>
          </View>
        ) : null}

        {!downloadedFonts.length && !availableFonts.length ? (
          <View style={typoStyles.emptyState}>
            <ThemedText style={[typoStyles.emptyText, { color: colors.textSecondary }]}>
              No fonts matching &quot;{searchQuery}&quot;
            </ThemedText>
          </View>
        ) : null}
      </View>
    </SettingsEditorScreen>
  );
}

const typoStyles = StyleSheet.create({
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

export function TimelineSettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setEntry } = usePreferences();
  const { entry } = preferences;

  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <View style={timelineStyles.container}>
        <View style={timelineStyles.section}>
          <ThemedText
            weight="medium"
            style={[timelineStyles.sectionHeading, { color: colors.textSecondary }]}
          >
            STYLE
          </ThemedText>
          <SegmentedRow<TimelineStyle>
            items={[
              { id: "rail", label: "Rail" },
              { id: "minimal", label: "Minimal" },
              { id: "clean", label: "Clean" },
            ]}
            selected={entry.timelineStyle}
            onSelect={(timelineStyle) => setEntry({ timelineStyle })}
          />
        </View>

        <View style={timelineStyles.section}>
          <ThemedText
            weight="medium"
            style={[timelineStyles.sectionHeading, { color: colors.textSecondary }]}
          >
            DENSITY
          </ThemedText>
          <SegmentedRow<TimelineDensity>
            items={[
              { id: "comfortable", label: "Comfortable" },
              { id: "compact", label: "Compact" },
            ]}
            selected={entry.timelineDensity}
            onSelect={(timelineDensity) => setEntry({ timelineDensity })}
          />
        </View>

        <View style={timelineStyles.section}>
          <ThemedText
            weight="medium"
            style={[timelineStyles.sectionHeading, { color: colors.textSecondary }]}
          >
            DETAILS
          </ThemedText>
          <View style={[timelineStyles.cardGroup, { backgroundColor: colors.surfaceMuted }]}>
            <ToggleRow
              label="Show Timestamps"
              value={entry.showTimestamp}
              onValueChange={(showTimestamp) => setEntry({ showTimestamp })}
            />
            <View style={[timelineStyles.divider, { backgroundColor: colors.separator }]} />
            <ToggleRow
              label="Show Location Tag"
              value={entry.showLocation}
              onValueChange={(showLocation) => setEntry({ showLocation })}
            />
          </View>
        </View>
      </View>
    </SettingsEditorScreen>
  );
}

const timelineStyles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  section: {
    gap: space.xs + 2,
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardGroup: {
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
