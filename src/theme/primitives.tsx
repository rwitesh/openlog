/**
 * Zero-boilerplate themed primitives.
 *
 *   <ThemedView surface="surface" radius="lg" />        → background + shape
 *   <ThemedText variant="body" color="textSecondary" />  → typography + ink
 *   <ThemedButton variant="primary" onPress={...} />     → accessible action
 *
 * These are intentionally thin: token application only. For richer variants,
 * compose them (or build on useThemedStyles) rather than growing prop APIs.
 */

import { forwardRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { metrics } from "./spacing";
import { useTheme } from "./ThemeContext";
import { useThemedStyles } from "./useThemedStyles";
import type { ThemeColors } from "./types";

/* ThemedView */

export type ThemedSurface = "background" | "surface" | "surfaceMuted";

export interface ThemedViewProps extends ViewProps {
  /** Semantic surface token applied as the background color. */
  surface?: ThemedSurface;
  /** Optional radius token. */
  radius?: "sm" | "md" | "lg";
}

export const ThemedView = forwardRef<View, ThemedViewProps>(function ThemedView(
  { surface = "background", radius, style, ...rest },
  ref
) {
  const { colors, radius: radii } = useTheme();

  const themedStyle: ViewStyle = {
    backgroundColor: colors[surface],
    ...(radius ? { borderRadius: radii[radius] } : null),
  };

  return <View ref={ref} style={[themedStyle, style]} {...rest} />;
});

/* ThemedText */

/** Map of semantic variants → typography tokens (see createTypography). */
const TEXT_VARIANT_TOKENS = {
  display: "headerGreeting",
  heading: "headerDate",
  title: "headerMonth",
  subtitle: "headerSubtitle",
  body: "entryText",
  composer: "composerText",
  caption: "caption",
  timestamp: "timestamp",
  label: "settingLabel",
  emptyTitle: "emptyTitle",
  emptyBody: "emptyBody",
} as const;

export type ThemedTextVariant = keyof typeof TEXT_VARIANT_TOKENS;
export type ThemedTextColor = Exclude<keyof ThemeColors, "background" | "surface" | "surfaceMuted" | "line" | "marker" | "separator">;

export interface ThemedTextProps extends TextProps {
  /** Typography token preset. */
  variant?: ThemedTextVariant;
  /** Semantic ink color. Defaults to `text`. */
  color?: ThemedTextColor;
  align?: TextStyle["textAlign"];
}

export const ThemedText = forwardRef<Text, ThemedTextProps>(function ThemedText(
  { variant = "body", color = "text", align, style, ...rest },
  ref
) {
  const { typography, colors } = useTheme();

  const themedStyle: TextStyle = {
    ...typography[TEXT_VARIANT_TOKENS[variant]],
    color: colors[color],
    ...(align ? { textAlign: align } : null),
  };

  return <Text ref={ref} style={[themedStyle, style]} {...rest} />;
});

/* ThemedButton */

export type ThemedButtonVariant = "primary" | "secondary" | "destructive";
export type ThemedButtonSize = "sm" | "md";

export interface ThemedButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ThemedButtonVariant;
  size?: ThemedButtonSize;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export function ThemedButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: ThemedButtonProps) {
  const { motion } = useTheme();

  // Factory is a pure function of the theme; variant/size are selected below.
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      base: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: t.radius.md,
      },
      sm: { height: metrics.btnSm, paddingHorizontal: t.spacing.lg },
      md: { height: metrics.btnMd, paddingHorizontal: t.spacing.xl },
      primary: { backgroundColor: t.colors.accent },
      secondary: {
        backgroundColor: t.colors.surfaceMuted,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.separator,
      },
      destructive: {
        backgroundColor: t.colors.destructive,
      },
      disabled: { opacity: 0.4 },
      labelPrimary: { ...t.typography.caption, color: t.colors.background },
      labelSecondary: { ...t.typography.caption, color: t.colors.text },
      labelDestructive: { ...t.typography.caption, color: t.colors.surface },
    })
  );

  // Static opacity feedback; skipped entirely under reduced motion.
  const pressFeedback =
    motion.level === "reduced" ? undefined : ({ opacity: 0.65 } as const);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        disabled && styles.disabled,
        pressed && pressFeedback,
        style,
      ]}
    >
      <Text
        style={[
          variant === "primary"
            ? styles.labelPrimary
            : variant === "destructive"
              ? styles.labelDestructive
              : styles.labelSecondary,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
