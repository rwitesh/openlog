import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";

interface AddEntryButtonProps {
  onPress: () => void;
}

export function AddEntryButton({ onPress }: AddEntryButtonProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          bottom: insets.bottom + space.lg,
          backgroundColor: colors.marker,
        },
        pressed && styles.pressed,
      ]}
      accessibilityLabel="Add entry"
      accessibilityRole="button"
    >
      <Feather name="plus" size={metrics.iconMd + 2} color={colors.background} />
    </Pressable>
  );
}

export const ADD_ENTRY_BUTTON_CLEARANCE = metrics.fabSize + space.lg + space.xl;

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    right: space.xl,
    width: metrics.fabSize,
    height: metrics.fabSize,
    borderRadius: metrics.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  pressed: {
    opacity: 0.8,
  },
});
