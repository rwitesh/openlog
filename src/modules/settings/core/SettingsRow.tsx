import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/shared/components/ThemedText";
import { press, radius, space, useTheme } from "@/theme";

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  onPress: () => void;
  /** Hide the chevron for immediate actions (alerts, direct toggles). */
  showChevron?: boolean;
  accessibilityLabel?: string;
}

/**
 * The universal settings row: icon, title, current-value subtitle, optional
 * leading badge, chevron. Every editor on the Settings screen opens through
 * one of these.
 */
export function SettingsRow({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  showChevron = true,
  accessibilityLabel,
}: SettingsRowProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.separator,
        },
        pressed && press,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || `${title}, ${subtitle}`}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.separator,
            },
          ]}
        >
          <Feather name={icon} size={18} color={colors.text} />
        </View>

        <View style={styles.textWrap}>
          <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
      </View>

      <View style={styles.right}>
        {badge}
        {showChevron ? (
          <Feather name="chevron-right" size={18} color={colors.textTertiary} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.md - 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md - 2,
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
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
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 3,
  },
});
