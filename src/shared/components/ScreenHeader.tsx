import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { metrics, press, space, useTheme } from "@/theme";
import { ThemedText } from "./ThemedText";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** In-app header drawn directly on the screen's themed background. */
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={space.md}
            style={({ pressed }) => [styles.backBtn, pressed && press]}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={metrics.iconMd} color={colors.text} />
          </Pressable>
        ) : null}

        <ThemedText
          weight="semibold"
          style={[typography.headerDate, styles.title, { color: colors.text }]}
        >
          {title}
        </ThemedText>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    zIndex: 10,
  },
  row: {
    minHeight: metrics.btnLg,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: metrics.btnLg,
    height: metrics.btnLg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.xs,
  },
  title: {
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginLeft: "auto",
  },
});
