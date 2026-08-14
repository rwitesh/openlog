import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/components/core/ui";

interface ViewMomentsActionProps {
  momentCount: number;
  monthName: string;
  onPress: () => void;
}

function ViewMomentsActionBase({
  momentCount,
  monthName,
  onPress,
}: ViewMomentsActionProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  if (momentCount === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.separator,
        },
        pressed && press,
      ]}
      accessibilityLabel={`View all ${momentCount} moments in ${monthName}`}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <ThemedText
          weight="medium"
          style={[styles.label, { color: colors.text }]}
        >
          View all {momentCount} {momentCount === 1 ? "moment" : "moments"}
        </ThemedText>
        <Feather name="arrow-right" size={metrics.iconSm} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

export const ViewMomentsAction = memo(ViewMomentsActionBase);

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    marginTop: space.xs,
    marginBottom: space.xxl,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});
