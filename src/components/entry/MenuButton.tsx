import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";

interface MenuButtonProps {
  onPress: () => void;
}

export function MenuButton({ onPress }: MenuButtonProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.md}
      style={({ pressed }) => [styles.btn, pressed && press]}
      accessibilityLabel="Options"
    >
      <Feather name="more-vertical" size={metrics.iconSm} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: metrics.btnSm,
    height: metrics.btnSm,
    alignItems: "center",
    justifyContent: "center",
  },
});
