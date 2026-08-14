import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";

interface EntryMenuButtonProps {
  onPress: () => void;
}

export function EntryMenuButton({ onPress }: EntryMenuButtonProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.md}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityLabel="Entry options"
    >
      <Feather name="more-vertical" size={17} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.5,
  },
});
