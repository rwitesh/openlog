import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { ThemedText } from "@/shared/components/ThemedText";

/** Labelled group of rows — the vertical rhythm unit of the settings list. */
export function SettingsGroup({
  label,
  children,
}: {
  /** Optional heading; omit for unlabeled groups (e.g. a lone action row). */
  label?: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.group}>
      {label ? (
        <ThemedText
          weight="medium"
          style={[styles.label, { color: theme.colors.textSecondary }]}
        >
          {label}
        </ThemedText>
      ) : null}
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginHorizontal: space.xl,
    marginBottom: space.md,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: space.sm,
  },
  rows: {
    gap: space.sm + 2,
  },
});
