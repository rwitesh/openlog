import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";

import { usePreferences, useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";

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

export function BackgroundSection() {
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
    <View style={styles.container}>
      {/* Top Action Grid: None vs Custom */}
      <View style={styles.topGrid}>
        {/* Left: None / Pure Theme */}
        <Pressable
          onPress={handleClearBackground}
          style={({ pressed }) => [
            styles.topCard,
            {
              backgroundColor: isNoneSelected ? colors.surface : colors.surfaceMuted,
              borderColor: isNoneSelected ? colors.accent : colors.separator,
            },
            isNoneSelected && styles.cardSelected,
            pressed && press,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isNoneSelected }}
          accessibilityLabel="None, pure theme background"
        >
          <View
            style={[
              styles.noneIconWrap,
              {
                backgroundColor: colors.background,
                borderColor: colors.separator,
              },
            ]}
          >
            <Feather name="slash" size={18} color={colors.textSecondary} />
          </View>

          <View style={styles.topCardText}>
            <ThemedText
              weight={isNoneSelected ? "semibold" : "medium"}
              style={[styles.topCardTitle, { color: colors.text }]}
            >
              None
            </ThemedText>
            <ThemedText style={[styles.topCardSubtitle, { color: colors.textSecondary }]}>
              Pure Theme
            </ThemedText>
          </View>

          {isNoneSelected ? (
            <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
              <Feather name="check" size={10} color={isDark ? "#121215" : "#FAF8F5"} />
            </View>
          ) : null}
        </Pressable>

        {/* Right: Custom Photo */}
        <Pressable
          onPress={handlePickFromGallery}
          disabled={isLoadingImage}
          style={({ pressed }) => [
            styles.topCard,
            {
              backgroundColor: isCustomSelected ? colors.surface : colors.surfaceMuted,
              borderColor: isCustomSelected ? colors.accent : colors.separator,
            },
            isCustomSelected && styles.cardSelected,
            pressed && press,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isCustomSelected }}
          accessibilityLabel="Custom photo from gallery"
        >
          {isCustomSelected && currentUri ? (
            <Image source={{ uri: currentUri }} style={styles.customThumbnail} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.noneIconWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.separator,
                },
              ]}
            >
              <Feather name="plus" size={18} color={colors.accent} />
            </View>
          )}

          <View style={styles.topCardText}>
            <ThemedText
              weight={isCustomSelected ? "semibold" : "medium"}
              style={[styles.topCardTitle, { color: colors.text }]}
            >
              {isLoadingImage ? "Loading..." : "Custom"}
            </ThemedText>
            <ThemedText style={[styles.topCardSubtitle, { color: colors.textSecondary }]}>
              {isCustomSelected ? "Tap to change" : "+ Image"}
            </ThemedText>
          </View>

          {isCustomSelected ? (
            <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
              <Feather name="check" size={10} color={isDark ? "#121215" : "#FAF8F5"} />
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Opacity Control (Active when background image is chosen) */}
      {currentUri ? (
        <View
          style={[
            styles.opacityContainer,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.separator,
            },
          ]}
        >
          <View style={styles.opacityHeader}>
            <View style={styles.opacityTitleRow}>
              <Feather name="sun" size={14} color={colors.textSecondary} />
              <ThemedText weight="medium" style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                OPACITY
              </ThemedText>
            </View>
            <View
              style={[
                styles.opacityBadge,
                { backgroundColor: colors.surface, borderColor: colors.separator },
              ]}
            >
              <ThemedText weight="semibold" style={[styles.opacityValueText, { color: colors.text }]}>
                {Math.round(liveOpacity * 100)}%
              </ThemedText>
            </View>
          </View>

          {/* Native Slider */}
          <Slider
            style={styles.slider}
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

          {/* Quick preset chips */}
          <View style={styles.presetChipsRow}>
            {OPACITY_PRESETS.map((p) => {
              const isActive = Math.abs(currentOpacity - p.value) < 0.05;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => handlePresetOpacity(p.value)}
                  style={({ pressed }) => [
                    styles.chip,
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
                      styles.chipText,
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

      {/* Curated Presets Header */}
      <ThemedText weight="medium" style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: space.xs }]}>
        CURATED PRESETS
      </ThemedText>

      {/* Curated Presets Grid */}
      <View style={styles.presetsGrid}>
        {KIZUNA_BACKGROUNDS.map((item) => {
          const isSelected = currentUri === item.uri;

          return (
            <Pressable
              key={item.id}
              onPress={() => handleSelectPreset(item.uri)}
              style={({ pressed }) => [
                styles.presetGridCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isSelected ? colors.accent : colors.separator,
                },
                isSelected && styles.cardSelected,
                pressed && press,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.name} background preset`}
            >
              <View style={styles.previewContainer}>
                <Image source={{ uri: item.uri }} style={styles.previewImage} resizeMode="cover" />
                {isSelected ? (
                  <View style={[styles.checkBadgeTop, { backgroundColor: colors.accent }]}>
                    <Feather name="check" size={10} color={isDark ? "#121215" : "#FAF8F5"} />
                  </View>
                ) : null}
              </View>

              <ThemedText
                weight={isSelected ? "semibold" : "medium"}
                style={[styles.presetTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

