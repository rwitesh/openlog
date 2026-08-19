import { StyleSheet, TextInput, View } from "react-native";

import { useProfile } from "@/modules/profile";
import { useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { ThemedText } from "@/shared/components/ThemedText";

/** Profile editor. Future identity fields (avatar, signature) slot in here. */
export function ProfileSection() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { name, setName } = useProfile();

  return (
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
