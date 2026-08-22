import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { space, useTheme } from "@/theme";

interface ToolbarProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Toolbar({ children, style }: ToolbarProps) {
  const { colors } = useTheme().theme;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.separator,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingVertical: space.xs,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
