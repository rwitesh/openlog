import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { metrics, press, space, type ThemeColors } from "@/theme";

interface HeaderIconActionsProps {
  colors: ThemeColors;
  onOpenSearch: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
}

export function HeaderIconActions({
  colors,
  onOpenSearch,
  onOpenCalendar,
  onOpenSettings,
}: HeaderIconActionsProps) {
  return (
    <View style={styles.actions}>
      <Pressable
        onPress={onOpenSearch}
        hitSlop={space.sm}
        style={({ pressed }) => [styles.iconBtn, pressed && press]}
        accessibilityLabel="Search"
        accessibilityRole="button"
      >
        <Feather name="search" size={metrics.iconMd} color={colors.text} />
      </Pressable>

      <Pressable
        onPress={onOpenCalendar}
        hitSlop={space.sm}
        style={({ pressed }) => [styles.iconBtn, pressed && press]}
        accessibilityLabel="Calendar"
        accessibilityRole="button"
      >
        <Feather name="calendar" size={metrics.iconMd} color={colors.text} />
      </Pressable>

      <Pressable
        onPress={onOpenSettings}
        hitSlop={space.sm}
        style={({ pressed }) => [styles.iconBtn, pressed && press]}
        accessibilityLabel="Settings"
        accessibilityRole="button"
      >
        <Feather name="settings" size={metrics.iconMd} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    height: metrics.btnLg,
  },
  iconBtn: {
    width: metrics.btnLg,
    height: metrics.btnLg,
    borderRadius: metrics.btnLg / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
