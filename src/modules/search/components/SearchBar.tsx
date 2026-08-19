import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme";
import { press } from "@/theme/motion";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { fontFamily, typography } from "@/theme/typography";
import { ThemedText } from "@/shared/components/ThemedText";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
}

/** Compact pill input with inline clear and cancel, shown while search is active. */
export function SearchBar({ value, onChange, onCancel }: SearchBarProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.row}>
      <View style={[styles.field, { backgroundColor: colors.surfaceMuted }]}>
        <Feather name="search" size={metrics.iconSm + 2} color={colors.textTertiary} />

        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Search your moments"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: fontFamily("regular", theme.fontFamily),
              fontSize: theme.typography.entryText.fontSize,
            },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus
          accessibilityLabel="Search your moments"
        />

        {value.length > 0 ? (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={space.sm}
            style={({ pressed }) => [styles.clearBtn, pressed && press]}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Feather name="x" size={metrics.iconSm} color={colors.textTertiary} />
          </Pressable>
        ) : (
          <View style={styles.clearBtn} />
        )}
      </View>

      <Pressable
        onPress={onCancel}
        hitSlop={space.sm}
        style={({ pressed }) => [styles.cancel, pressed && press]}
        accessibilityLabel="Cancel search"
        accessibilityRole="button"
      >
        <ThemedText weight="medium" style={[styles.cancelText, { color: colors.accent }]}>
          Cancel
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: metrics.btnMd + 4,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
  },
  input: {
    flex: 1,
    paddingVertical: space.sm + 2,
    letterSpacing: 0.1,
  },
  clearBtn: {
    width: metrics.btnSm,
    height: metrics.btnSm,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    paddingVertical: space.xs,
  },
  cancelText: {
    fontSize: typography.settingLabel.fontSize,
    lineHeight: typography.settingLabel.lineHeight,
  },
});
