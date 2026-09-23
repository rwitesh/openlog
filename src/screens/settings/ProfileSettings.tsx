import { StyleSheet, TextInput, View } from "react-native";

import { useProfile } from "@/modules/profile";
import { SettingsGroup, SettingsScreenScroll } from "@/modules/settings";
import { ThemedText } from "@/shared/components/ThemedText";
import { space, typography, useTheme } from "@/theme";

// Local profile: the name is stored on this device only.
export function ProfileSettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { name, setName } = useProfile();

  return (
    <SettingsScreenScroll>
      <SettingsGroup label="ACCOUNT">
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
