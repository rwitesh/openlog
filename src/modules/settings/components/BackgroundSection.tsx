import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
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

/**
 * Background picker, flattened for the unified settings screen: pure-theme and
 * curated presets first, then a personal photo from the device gallery.
 */
export function BackgroundSection() {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const currentUri = preferences.appearance.backgroundImageUri;
  const isCuratedSelected = KIZUNA_BACKGROUNDS.some((p) => p.uri === currentUri);
  const isCustomSelected = Boolean(currentUri && !isCuratedSelected);
  const isNoneSelected = !currentUri;

  const handlePickFromGallery = async () => {
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
  };

  const handleClearBackground = () => {
    setAppearance({ backgroundImageUri: null });
  };

  return (
    <View style={styles.container}>
      {/* Pure Theme Option */}
      <Pressable
        onPress={handleClearBackground}
        style={({ pressed }) => [
          styles.presetCard,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: isNoneSelected ? colors.accent : colors.separator,
          },
          isNoneSelected && styles.presetCardSelected,
          pressed && press,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isNoneSelected }}
        accessibilityLabel="None, pure theme background"
      >
        <View
          style={[
            styles.noneThumbnail,
            {
              backgroundColor: colors.background,
              borderColor: colors.separator,
            },
          ]}
        >
          <Feather name="slash" size={18} color={colors.textTertiary} />
        </View>

        <ThemedText
          weight={isNoneSelected ? "semibold" : "medium"}
          style={[styles.cardTitle, { color: colors.text }]}
        >
          None (Pure Theme)
        </ThemedText>

        {isNoneSelected ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Feather name="check" size={11} color={isDark ? "#121215" : "#FAF8F5"} />
          </View>
        ) : null}
      </Pressable>

      {/* Curated Library */}
      {KIZUNA_BACKGROUNDS.map((item) => {
        const isSelected = currentUri === item.uri;

        return (
          <Pressable
            key={item.id}
            onPress={() => setAppearance({ backgroundImageUri: item.uri })}
            style={({ pressed }) => [
              styles.presetCard,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: isSelected ? colors.accent : colors.separator,
              },
              isSelected && styles.presetCardSelected,
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${item.name} background`}
          >
            <Image source={{ uri: item.uri }} style={styles.cardThumbnail} resizeMode="cover" />

            <ThemedText
              weight={isSelected ? "semibold" : "medium"}
              style={[styles.cardTitle, { color: colors.text }]}
            >
              {item.name}
            </ThemedText>

            {isSelected ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={11} color={isDark ? "#121215" : "#FAF8F5"} />
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {/* Personal Photo */}
      <ThemedText weight="medium" style={[styles.customHeading, { color: colors.textSecondary }]}>
        MY PHOTO
      </ThemedText>

      {isCustomSelected && currentUri ? (
        <View style={styles.customActiveContainer}>
          <View style={[styles.customPreviewFrame, { borderColor: colors.separator }]}>
            <Image source={{ uri: currentUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background, opacity: 0.35 },
              ]}
            />
          </View>

          <View style={styles.customActionsRow}>
            <Pressable
              onPress={handlePickFromGallery}
              disabled={isLoadingImage}
              style={({ pressed }) => [
                styles.pickButton,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
                pressed && press,
              ]}
              accessibilityRole="button"
            >
              <Feather name="image" size={15} color={colors.text} />
              <ThemedText weight="medium" style={[styles.btnText, { color: colors.text }]}>
                {isLoadingImage ? "Loading..." : "Choose Another Photo"}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleClearBackground}
              style={({ pressed }) => [
                styles.clearButton,
                { borderColor: colors.separator },
                pressed && press,
              ]}
              accessibilityRole="button"
            >
              <Feather name="trash-2" size={15} color={colors.destructive} />
              <ThemedText weight="medium" style={[styles.btnText, { color: colors.destructive }]}>
                Remove
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handlePickFromGallery}
          disabled={isLoadingImage}
          style={({ pressed }) => [
            styles.uploadBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.separator,
            },
            pressed && press,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Choose photo from device gallery"
        >
          <View
            style={[
              styles.uploadIconWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.separator,
              },
            ]}
          >
            <Feather name="plus" size={20} color={colors.accent} />
          </View>

          <ThemedText weight="medium" style={[styles.uploadTitle, { color: colors.text }]}>
            {isLoadingImage ? "Opening Gallery..." : "Select Photo from Gallery"}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.sm,
  },
  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: space.md,
  },
  presetCardSelected: {
    borderWidth: 2,
  },
  cardThumbnail: {
    width: 52,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: "#ccc",
  },
  noneThumbnail: {
    width: 52,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  customHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: space.xs,
  },
  customActiveContainer: {
    gap: space.md,
  },
  customPreviewFrame: {
    height: 140,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  customActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  pickButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs + 2,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnText: {
    fontSize: 13,
    lineHeight: 17,
  },
  uploadBox: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  uploadIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space.xs,
  },
  uploadTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
});
