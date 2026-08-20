import { Text, type TextProps } from "react-native";

import { type FontWeight, fontFamily, useTheme } from "@/theme";

export interface ThemedTextProps extends TextProps {
  weight?: FontWeight;
}

export function ThemedText({ style, weight = "regular", ...rest }: ThemedTextProps) {
  const { theme } = useTheme();

  return (
    <Text
      style={[
        { color: theme.colors.text, fontFamily: fontFamily(weight, theme.fontFamily) },
        style,
      ]}
      {...rest}
    />
  );
}
