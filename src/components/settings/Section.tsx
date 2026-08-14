import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { FONT_SIZE } from "@/theme/typography";
import { ThemedText } from "@/components/core";

interface SectionProps extends ViewProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children, style, ...rest }: SectionProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.section, style]} {...rest}>
      <ThemedText
        weight="medium"
        style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
      >
        {title.toUpperCase()}
      </ThemedText>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.separator },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: space.xxxl + space.xs,
    paddingHorizontal: space.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    letterSpacing: 1.2,
    marginBottom: space.md,
    marginLeft: space.xs,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
