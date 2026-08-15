import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { THEME_PALETTES, type ThemeOption } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";

interface ThemeCardProps {
  option: ThemeOption;
  isSelected: boolean;
  onSelect: () => void;
}

export function ThemeCard({ option, isSelected, onSelect }: ThemeCardProps) {
  const { theme, mode } = useTheme();
  const { colors } = theme;

  const palette = THEME_PALETTES[option.id];
  const previewColors = mode === "dark" ? palette.dark : palette.light;

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isSelected ? colors.surface : colors.surfaceMuted,
          borderColor: isSelected ? colors.marker : colors.separator,
          borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
        },
        isSelected && styles.cardSelected,
        pressed && press,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Theme ${option.label}, ${option.category}. ${isSelected ? "Currently selected" : "Tap to select."}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View
        style={[
          styles.previewCanvas,
          {
            backgroundColor: previewColors.background,
            borderColor: previewColors.separator,
          },
        ]}
      >
        <View
          style={[
            styles.miniSurface,
            {
              backgroundColor: previewColors.surface,
              borderColor: previewColors.separator,
            },
          ]}
        >
          <View style={styles.miniGutter}>
            <View
              style={[
                styles.miniMarker,
                { backgroundColor: previewColors.marker },
              ]}
            />
            <View
              style={[
                styles.miniLine,
                { backgroundColor: previewColors.line },
              ]}
            />
          </View>

          <View style={styles.miniBody}>
            <ThemedText
              weight="semibold"
              style={[
                styles.miniGlyph,
                { color: previewColors.text },
              ]}
            >
              Aa
            </ThemedText>
            <View
              style={[
                styles.miniAccentPill,
                { backgroundColor: previewColors.accent },
              ]}
            />
          </View>
        </View>

        {isSelected ? (
          <View
            style={[
              styles.selectedBadge,
              { backgroundColor: colors.marker },
            ]}
          >
            <Feather name="check" size={10} color={colors.background} />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <ThemedText
          weight={isSelected ? "semibold" : "medium"}
          numberOfLines={1}
          style={[
            styles.title,
            { color: isSelected ? colors.text : colors.textSecondary },
          ]}
        >
          {option.label}
        </ThemedText>
        <ThemedText
          numberOfLines={1}
          style={[styles.category, { color: colors.textTertiary }]}
        >
          {option.category === "quiet" ? "Quiet" : "Expressive"}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    borderRadius: radius.md,
    padding: space.xs + 2,
    gap: space.xs,
  },
  cardSelected: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  previewCanvas: {
    height: 84,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  miniSurface: {
    flex: 1,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  miniGutter: {
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-start",
    paddingTop: 2,
    gap: 2,
  },
  miniMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  miniLine: {
    width: 1.5,
    flex: 1,
    borderRadius: 1,
  },
  miniBody: {
    flex: 1,
    justifyContent: "space-between",
    height: "100%",
    paddingVertical: 2,
  },
  miniGlyph: {
    fontSize: 16,
    lineHeight: 18,
  },
  miniAccentPill: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  selectedBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  info: {
    paddingHorizontal: 2,
    paddingBottom: 2,
    gap: 1,
  },
  title: {
    fontSize: 13,
    lineHeight: 17,
  },
  category: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "capitalize",
  },
});
