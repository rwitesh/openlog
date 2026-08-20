import { StyleSheet, TextInput, View } from "react-native";

import { useProfile } from "@/modules/profile";
import { SettingsGroup, SettingsScreenScroll } from "@/modules/settings";
import { ThemedText } from "@/shared/components/ThemedText";
import { space, typography, useTheme } from "@/theme";

/**
 * Profile category screen — the journal owner's identity. Future identity
 * fields (avatar, signature) render as siblings inside the group.
 */
export function ProfileSettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { name, setName } = useProfile();

  return (
    <SettingsScreenScroll>
      <SettingsGroup label="IDENTITY">
        <View style={styles.fieldRow}>
          <ThemedText style={[typography.settingLabel, { color: colors.textSecondary }]}>
            Name
          </ThemedText>
          <TextInput
            value={name ?? ""}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            style={[
              styles.nameInput,
              typography.settingLabel,
              { color: colors.text, borderBottomColor: colors.separator },
            ]}
          />
        </View>
      </SettingsGroup>
    </SettingsScreenScroll>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    paddingVertical: space.sm,
    gap: space.xs,
  },
  nameInput: {
    paddingVertical: space.xs,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
