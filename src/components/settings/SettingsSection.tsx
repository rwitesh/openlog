import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { ThemedText } from "@/components/core";

interface SettingsSectionProps extends ViewProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children, style, ...rest }: SettingsSectionProps) {
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
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: space.md,
    marginLeft: space.xs,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
