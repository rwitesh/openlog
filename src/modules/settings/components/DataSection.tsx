import { Pressable, StyleSheet } from "react-native";

import { useEntries } from "@/modules/entry";
import { deleteMediaList } from "@/services/media";
import { useTheme } from "@/theme";
import { press } from "@/theme/motion";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { ThemedText } from "@/shared/components/ThemedText";
import { confirmDestructive } from "../utils/confirm";

/**
 * Data & storage editor. Destructive actions confirm before running; future
 * export/backup controls live here too.
 */
export function DataSection() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { clearAll } = useEntries();

  const confirmDeleteEntries = () =>
    confirmDestructive(
      "Delete all entries?",
      "This permanently removes every entry and its attached media. This cannot be undone.",
      "Delete",
      async () => deleteMediaList(await clearAll())
    );

  return (
    <Pressable
      onPress={confirmDeleteEntries}
      style={({ pressed }) => [styles.deleteBtn, pressed && press]}
      accessibilityRole="button"
      accessibilityLabel="Delete all entries permanently"
    >
      <ThemedText style={[typography.settingLabel, { color: colors.destructive }]}>
        Delete all entries
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  deleteBtn: {
    paddingVertical: space.sm,
  },
});
