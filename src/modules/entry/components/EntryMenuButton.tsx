import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { metrics, press, space, useTheme } from "@/theme";

interface MenuButtonProps {
  onPress: () => void;
}

export function EntryMenuButton({ onPress }: MenuButtonProps) {
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
