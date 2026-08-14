import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";

interface ToolbarProps {
  children: React.ReactNode;
}

export function Toolbar({ children }: ToolbarProps) {
  const { colors } = useTheme().theme;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderColor: colors.separator,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingTop: space.sm,
    paddingHorizontal: space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
