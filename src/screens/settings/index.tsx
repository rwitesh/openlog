import { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import type { ThemeMode } from "@/types/entry";
import { useTheme } from "@/theme/ThemeProvider";
import { useEntries } from "@/entries";
import { getAutoLocation, setAutoLocation } from "@/db/settings";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { deleteMediaList, logDevWarning } from "@/lib";
import { Section, ThemedText } from "@/components/core";

const APPEARANCE: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "System" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => Promise<void>
) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: () => void onConfirm() },
  ]);
}

export function Settings() {
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useTheme();
  const { clearAll, resetDb } = useEntries();
  const [autoLocation, setAutoLocationState] = useState(false);

  useEffect(() => {
    getAutoLocation()
      .then(setAutoLocationState)
      .catch((error) => logDevWarning("settings:getAutoLocation", error));
  }, []);

  const toggleAutoLocation = async (enabled: boolean) => {
    setAutoLocationState(enabled);
    try {
      await setAutoLocation(enabled);
    } catch (error) {
      logDevWarning("settings:setAutoLocation", error);
      setAutoLocationState(!enabled);
    }
  };

  const confirmDeleteEntries = () =>
    confirmDestructive(
      "Delete all entries?",
      "This permanently removes every entry and its attached media. This cannot be undone.",
      "Delete",
      async () => deleteMediaList(await clearAll())
    );

  const confirmResetDatabase = () =>
    confirmDestructive(
      "Reset database?",
      "Drops and recreates the local database tables. Use this if the schema changed or data looks corrupted. All entries and media will be removed.",
      "Reset",
      async () => deleteMediaList(await resetDb())
    );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}
    >
      <Section title="Appearance">
        {APPEARANCE.map((option) => (
          <Pressable
            key={option.mode}
            onPress={() => setMode(option.mode)}
            style={({ pressed }) => [styles.row, pressed && press]}
          >
            <ThemedText style={[typography.settingLabel, { color: theme.colors.text }]}>
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
        <View style={styles.row}>
          <Feather name="map-pin" size={metrics.iconMd} color={theme.colors.text} />
          <Switch
            value={autoLocation}
            onValueChange={toggleAutoLocation}
            trackColor={{
              false: theme.colors.line,
              true: theme.colors.marker,
            }}
          />
        </View>
      </Section>

      <Section title="Data">
        <Pressable
          onPress={confirmDeleteEntries}
          style={({ pressed }) => [styles.row, pressed && press]}
        >
          <ThemedText style={[typography.settingLabel, { color: theme.colors.destructive }]}>
            Delete all entries
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={confirmResetDatabase}
          style={({ pressed }) => [styles.row, pressed && press]}
        >
          <ThemedText style={[typography.settingLabel, { color: theme.colors.destructive }]}>
            Reset database
          </ThemedText>
        </Pressable>
      </Section>
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
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
});
