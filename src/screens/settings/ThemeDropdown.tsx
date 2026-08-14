import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PAPER_MOODS, THEME_PALETTES, type PaperMood } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { Sheet, ThemedText } from "@/components/core/ui";

interface ThemeDropdownProps {
  selectedMood: PaperMood;
  onSelect: (mood: PaperMood) => void;
}

export function ThemeDropdown({ selectedMood, onSelect }: ThemeDropdownProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [modalOpen, setModalOpen] = useState(false);

  const currentTheme = THEME_PALETTES[selectedMood] ?? THEME_PALETTES.warm;

  const handleSelect = (mood: PaperMood) => {
    onSelect(mood);
    setModalOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setModalOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.separator,
          },
          pressed && press,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Theme: ${currentTheme.label}. Tap to change.`}
      >
        <ThemedText
          weight="medium"
          style={[typography.settingLabel, { color: colors.text }]}
        >
          {currentTheme.label}
        </ThemedText>

        <Feather name="chevron-down" size={metrics.iconSm + 2} color={colors.textSecondary} />
      </Pressable>

      <Sheet visible={modalOpen} onClose={() => setModalOpen(false)}>
        <View style={styles.sheetHeader}>
          <ThemedText weight="semibold" style={[styles.sheetTitle, { color: colors.text }]}>
            Choose Paper & Ink
          </ThemedText>
        </View>

        <FlatList
          data={PAPER_MOODS}
          keyExtractor={(item) => item.id}
          style={styles.sheetList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isSelected = item.id === selectedMood;

            return (
              <Pressable
                onPress={() => handleSelect(item.id)}
                style={({ pressed }) => [
                  styles.optionRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                  pressed && press,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <ThemedText
                  weight={isSelected ? "semibold" : "regular"}
                  style={[
                    typography.settingLabel,
                    { color: isSelected ? colors.text : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </ThemedText>

                {isSelected ? (
                  <Feather name="check" size={metrics.iconSm + 2} color={colors.marker} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 3,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space.sm,
  },
  sheetHeader: {
    marginBottom: space.md,
  },
  sheetTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  sheetList: {
    maxHeight: 340,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.md,
  },
});
