import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { ThemedText } from "@/shared/components/ThemedText";

interface CollapsibleSectionProps {
  title: string;
  summary: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  summary,
  defaultExpanded = false,
  children,
}: CollapsibleSectionProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.separator,
        },
      ]}
    >
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && press]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, currently ${summary}`}
        accessibilityState={{ expanded }}
      >
        <View style={styles.titleGroup}>
          <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
            {title}
          </ThemedText>
          <ThemedText
            style={[styles.summary, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {summary}
          </ThemedText>
        </View>

        <View style={styles.iconSlot}>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={metrics.iconSm + 2}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={[styles.body, { borderTopColor: colors.separator }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: space.xl,
    marginBottom: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
    marginRight: space.md,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  summary: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
