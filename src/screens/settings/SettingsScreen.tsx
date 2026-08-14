import { StyleSheet, View, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ThemeMode } from "@/types/entry";
import { useTheme } from "@/hooks/useTheme";
import { useEntries } from "@/hooks/useEntries";
import { space } from "@/theme/spacing";
import { deleteMediaList } from "@/lib";
import { ThemedText } from "@/components/core";
import { SettingsSection } from "@/components/settings";

const APPEARANCE: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "System" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useTheme();
  const { clearAll, resetDb } = useEntries();

  const confirmDeleteEntries = () => {
    Alert.alert(
      "Delete all entries?",
      "This permanently removes every entry and its attached media. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const uris = await clearAll();
            await deleteMediaList(uris);
          },
        },
      ]
    );
  };

  const confirmResetDatabase = () => {
    Alert.alert(
      "Reset database?",
      "Drops and recreates the local database tables. Use this if the schema changed or data looks corrupted. All entries and media will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            const uris = await resetDb();
            await deleteMediaList(uris);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingTop: space.xxl + space.xs, paddingBottom: insets.bottom + space.xxxl + space.sm }}
    >
      <SettingsSection title="Appearance">
        {APPEARANCE.map((option) => (
          <Pressable
            key={option.mode}
            onPress={() => setMode(option.mode)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.5 }]}
          >
            <ThemedText style={[styles.rowLabel, { color: theme.colors.text }]}>
              {option.label}
            </ThemedText>
            <View
              style={[
                styles.radio,
                {
                  borderColor:
                    mode === option.mode ? theme.colors.marker : theme.colors.line,
                  backgroundColor:
                    mode === option.mode ? theme.colors.marker : "transparent",
                },
              ]}
            />
          </Pressable>
        ))}
      </SettingsSection>

      <SettingsSection title="Data">
        <Pressable
          onPress={confirmDeleteEntries}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.5 }]}
        >
          <ThemedText style={[styles.rowLabel, { color: theme.colors.destructive }]}>
            Delete all entries
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={confirmResetDatabase}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.5 }]}
        >
          <ThemedText style={[styles.rowLabel, { color: theme.colors.destructive }]}>
            Reset database
          </ThemedText>
        </Pressable>
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.lg,
    paddingHorizontal: space.lg + space.xs,
  },
  rowLabel: {
    fontSize: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
});
