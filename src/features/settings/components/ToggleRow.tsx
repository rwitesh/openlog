import { StyleSheet, Switch, View } from "react-native";
import { useTheme } from "@/theme";
import { typography } from "@/theme/typography";
import { space } from "@/theme/spacing";
import { ThemedText } from "@/shared/components/ThemedText";

interface ToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}

export function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
}: ToggleRowProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.toggleRow}>
      <View style={styles.textWrap}>
        <ThemedText style={[typography.settingLabel, { color: colors.text }]}>
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.marker }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
  },
  textWrap: {
    flex: 1,
    paddingRight: space.md,
    gap: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
