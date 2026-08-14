import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { FONT } from "@/theme/typography";

type Weight = "regular" | "medium" | "semibold";

export interface ThemedTextProps extends TextProps {
  weight?: Weight;
}

/**
 * Text with the app font and default text color applied. Pass `weight` to
 * switch between the three loaded Source Sans 3 weights.
 */
export function ThemedText({ style, weight = "regular", ...rest }: ThemedTextProps) {
  const { theme } = useTheme();
  const fontFamily =
    weight === "semibold" ? FONT.semibold : weight === "medium" ? FONT.medium : FONT.regular;

  return (
    <Text
      style={[{ color: theme.colors.text, fontFamily }, style]}
      {...rest}
    />
  );
}
