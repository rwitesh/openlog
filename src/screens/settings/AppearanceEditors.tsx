import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
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
  DEFAULT_FONT_FAMILY,
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
}

const THEME_OPTIONS: ThemeOptionItem[] = [
  {
    id: "light",
    title: "Light",
    subtitle: "Gallery White",
    swatchBg: "#FAF8F5",
    swatchText: "#181614",
    swatchSurface: "#FFFFFF",
  },
  {
    id: "dark",
    title: "Dark",
    subtitle: "Charcoal Black",
    swatchBg: "#121215",
    swatchText: "#F2F2F5",
    swatchSurface: "#191A1E",
  },
  {
    id: "system",
    title: "System",
    subtitle: "Match Device",
    swatchBg: "transparent",
    swatchText: "#181614",
    swatchSurface: "transparent",
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
                      opt.id === "system" ? (isDark ? "#121215" : "#FAF8F5") : opt.swatchBg,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <View
                  style={[
                    themeStyles.miniCard,
                    {
                      backgroundColor:
                        opt.id === "system" ? (isDark ? "#191A1E" : "#FFFFFF") : opt.swatchSurface,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <View
                    style={[
                      themeStyles.miniLinePrimary,
                      {
                        backgroundColor:
                          opt.id === "system" ? (isDark ? "#F2F2F5" : "#181614") : opt.swatchText,
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
                              ? "#9697A3"
                              : "#6E675F"
                            : opt.id === "dark"
                              ? "#9697A3"
                              : "#6E675F",
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
                {isSelected ? (
                  <Feather name="check" size={11} color={isDark ? "#121215" : "#FAF8F5"} />
                ) : null}
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
                  {isSelected ? (
                    <Feather name="check" size={13} color={isDark ? "#121215" : "#FAF8F5"} />
                  ) : null}
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

export interface KizunaBackgroundPreset {
  id: string;
  name: string;
  uri: string;
}

export const KIZUNA_BACKGROUNDS: KizunaBackgroundPreset[] = [
  {
    id: "washi",
    name: "Washi Paper",
    uri: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "mist",
    name: "Bamboo Mist",
    uri: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "zen",
    name: "Stone Garden",
    uri: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "dusk",
    name: "Kyoto Dusk",
    uri: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "linen",
    name: "Warm Linen",
    uri: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "cedar",
    name: "Cedar Canopy",
    uri: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80",
  },
];

const OPACITY_PRESETS = [
  { label: "15%", value: 0.15 },
  { label: "35%", value: 0.35 },
  { label: "55%", value: 0.55 },
  { label: "75%", value: 0.75 },
];

export function BackgroundSettingsScreen() {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const currentUri = preferences.appearance.backgroundImageUri;
  const currentOpacity = preferences.appearance.backgroundImageOpacity ?? 0.35;
  const [liveOpacity, setLiveOpacity] = useState(currentOpacity);

  useEffect(() => {
    setLiveOpacity(currentOpacity);
  }, [currentOpacity]);

  const isCuratedSelected = KIZUNA_BACKGROUNDS.some((p) => p.uri === currentUri);
  const isCustomSelected = Boolean(currentUri && !isCuratedSelected);
  const isNoneSelected = !currentUri;

  const handlePickFromGallery = useCallback(async () => {
    try {
      setIsLoadingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to choose a background image for Kizuna."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAppearance({
          backgroundImageUri: result.assets[0].uri,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to select image.";
      Alert.alert("Error Selecting Image", msg);
    } finally {
      setIsLoadingImage(false);
    }
  }, [setAppearance]);

  const handleClearBackground = useCallback(() => {
    setAppearance({ backgroundImageUri: null });
  }, [setAppearance]);

  const handleSelectPreset = useCallback(
    (uri: string) => {
      setAppearance({ backgroundImageUri: uri });
    },
    [setAppearance]
  );

  const handleSliderComplete = useCallback(
    (val: number) => {
      const rounded = Math.round(val * 100) / 100;
      setLiveOpacity(rounded);
      setAppearance({ backgroundImageOpacity: rounded });
    },
    [setAppearance]
  );

  const handlePresetOpacity = useCallback(
    (value: number) => {
      setLiveOpacity(value);
      setAppearance({ backgroundImageOpacity: value });
    },
    [setAppearance]
  );

  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <View style={bgStyles.container}>
        <View style={bgStyles.topGrid}>
          <Pressable
            onPress={handleClearBackground}
            style={({ pressed }) => [
              bgStyles.topCard,
              {
                backgroundColor: isNoneSelected ? colors.surface : colors.surfaceMuted,
                borderColor: isNoneSelected ? colors.accent : colors.separator,
              },
              isNoneSelected && bgStyles.cardSelected,
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isNoneSelected }}
            accessibilityLabel="None, pure theme background"
          >
            <View
              style={[
                bgStyles.noneIconWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.separator,
                },
              ]}
            >
              <Feather name="slash" size={18} color={colors.textSecondary} />
            </View>

            <View style={bgStyles.topCardText}>
              <ThemedText
                weight={isNoneSelected ? "semibold" : "medium"}
                style={[bgStyles.topCardTitle, { color: colors.text }]}
              >
                None
              </ThemedText>
              <ThemedText style={[bgStyles.topCardSubtitle, { color: colors.textSecondary }]}>
                Default
              </ThemedText>
            </View>

            {isNoneSelected ? (
              <View style={[bgStyles.checkBadge, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={10} color={isDark ? "#121215" : "#FAF8F5"} />
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={handlePickFromGallery}
            disabled={isLoadingImage}
            style={({ pressed }) => [
              bgStyles.topCard,
              {
                backgroundColor: isCustomSelected ? colors.surface : colors.surfaceMuted,
                borderColor: isCustomSelected ? colors.accent : colors.separator,
              },
              isCustomSelected && bgStyles.cardSelected,
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isCustomSelected }}
            accessibilityLabel="Custom photo from gallery"
          >
            {isCustomSelected && currentUri ? (
              <Image
                source={{ uri: currentUri }}
                style={bgStyles.customThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  bgStyles.noneIconWrap,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <Feather name="plus" size={18} color={colors.accent} />
              </View>
            )}

            <View style={bgStyles.topCardText}>
              <ThemedText
                weight={isCustomSelected ? "semibold" : "medium"}
                style={[bgStyles.topCardTitle, { color: colors.text }]}
              >
                {isLoadingImage ? "Loading..." : "Custom"}
              </ThemedText>
              <ThemedText style={[bgStyles.topCardSubtitle, { color: colors.textSecondary }]}>
                Photo
              </ThemedText>
            </View>

            {isCustomSelected ? (
              <View style={[bgStyles.checkBadge, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={10} color={isDark ? "#121215" : "#FAF8F5"} />
              </View>
            ) : null}
          </Pressable>
        </View>

        {currentUri ? (
          <View
            style={[
              bgStyles.opacityContainer,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.separator,
              },
            ]}
          >
            <View style={bgStyles.opacityHeader}>
              <View style={bgStyles.opacityTitleRow}>
                <Feather name="sun" size={14} color={colors.textSecondary} />
                <ThemedText
                  weight="medium"
                  style={[bgStyles.sectionHeading, { color: colors.textSecondary }]}
                >
                  OPACITY
                </ThemedText>
              </View>
              <View
                style={[
                  bgStyles.opacityBadge,
                  { backgroundColor: colors.surface, borderColor: colors.separator },
                ]}
              >
                <ThemedText
                  weight="semibold"
                  style={[bgStyles.opacityValueText, { color: colors.text }]}
                >
                  {Math.round(liveOpacity * 100)}%
                </ThemedText>
              </View>
            </View>

            <Slider
              style={bgStyles.slider}
              minimumValue={0.1}
              maximumValue={0.95}
              step={0.01}
              value={liveOpacity}
              onValueChange={setLiveOpacity}
              onSlidingComplete={handleSliderComplete}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.separator}
              thumbTintColor={colors.accent}
              accessibilityLabel="Background image opacity"
              accessibilityRole="adjustable"
            />

            <View style={bgStyles.presetChipsRow}>
              {OPACITY_PRESETS.map((p) => {
                const isActive = Math.abs(currentOpacity - p.value) < 0.05;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => handlePresetOpacity(p.value)}
                    style={({ pressed }) => [
                      bgStyles.chip,
                      {
                        backgroundColor: isActive ? colors.surface : "transparent",
                        borderColor: isActive ? colors.accent : colors.separator,
                      },
                      pressed && press,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Opacity ${p.label}`}
                  >
                    <ThemedText
                      weight={isActive ? "semibold" : "regular"}
                      style={[
                        bgStyles.chipText,
                        { color: isActive ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {p.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <ThemedText
          weight="medium"
          style={[bgStyles.sectionHeading, { color: colors.textSecondary, marginTop: space.xs }]}
        >
          PRESETS
        </ThemedText>

        <View style={bgStyles.presetsGrid}>
          {KIZUNA_BACKGROUNDS.map((item) => {
            const isSelected = currentUri === item.uri;

            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelectPreset(item.uri)}
                style={({ pressed }) => [
                  bgStyles.presetGridCard,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: isSelected ? colors.accent : colors.separator,
                  },
                  isSelected && bgStyles.cardSelected,
                  pressed && press,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${item.name} background preset`}
              >
                <View style={bgStyles.previewContainer}>
                  <Image
                    source={{ uri: item.uri }}
                    style={bgStyles.previewImage}
                    resizeMode="cover"
                  />
                  {isSelected ? (
                    <View style={[bgStyles.checkBadgeTop, { backgroundColor: colors.accent }]}>
                      <Feather name="check" size={10} color={isDark ? "#121215" : "#FAF8F5"} />
                    </View>
                  ) : null}
                </View>

                <ThemedText
                  weight={isSelected ? "semibold" : "medium"}
                  style={[bgStyles.presetTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SettingsEditorScreen>
  );
}

const bgStyles = StyleSheet.create({
  container: {
    gap: space.md - 2,
  },
  topGrid: {
    flexDirection: "row",
    gap: space.sm,
  },
  topCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: space.sm,
    position: "relative",
  },
  cardSelected: {
    borderWidth: 2,
  },
  noneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  customThumbnail: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: "#ccc",
  },
  topCardText: {
    flex: 1,
    gap: 1,
  },
  topCardTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  topCardSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadgeTop: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  opacityContainer: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm + 2,
  },
  opacityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  opacityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
  },
  opacityBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  opacityValueText: {
    fontSize: 12,
    lineHeight: 16,
  },
  slider: {
    width: "100%",
    height: 36,
  },
  presetChipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.xs,
  },
  chip: {
    flex: 1,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  presetGridCard: {
    width: "48.2%",
    padding: space.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: space.xs + 2,
  },
  previewContainer: {
    width: "100%",
    height: 64,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: "#ccc",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  presetTitle: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});
