import { StyleSheet, View, ScrollView, Pressable, Alert, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ThemeMode } from "@/types/entry";
import { useTheme } from "@/theme/ThemeProvider";
import { useProfile } from "@/profile";
import { useEntries } from "@/entries";
import { space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { deleteMediaList } from "@/lib";
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
  const { name, setName } = useProfile();
  const { clearAll } = useEntries();

  const confirmDeleteEntries = () =>
    confirmDestructive(
      "Delete all entries?",
      "This permanently removes every entry and its attached media. This cannot be undone.",
      "Delete",
      async () => deleteMediaList(await clearAll())
    );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}
    >
      <Section title="Profile">
        <View style={styles.fieldRow}>
          <ThemedText style={[typography.settingLabel, { color: theme.colors.textSecondary }]}>
            Name
          </ThemedText>
          <TextInput
            value={name ?? ""}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            style={[
              styles.nameInput,
              typography.settingLabel,
              { color: theme.colors.text },
            ]}
          />
        </View>
      </Section>

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
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    paddingVertical: space.lg,
    paddingHorizontal: space.lg + space.xs,
    gap: space.sm,
  },
  nameInput: {
    padding: 0,
  },
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
