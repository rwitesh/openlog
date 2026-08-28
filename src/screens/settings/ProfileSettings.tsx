import { useAuth, useUser } from "@clerk/expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, TextInput, View } from "react-native";

import { useProfile } from "@/modules/profile";
import { SettingsGroup, SettingsRow, SettingsScreenScroll } from "@/modules/settings";
import type { RootStackParamList } from "@/navigation/types";
import { ThemedText } from "@/shared/components/ThemedText";
import { reportError } from "@/shared/utils";
import { space, typography, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsProfile">;

// Account details when signed in; optional beta login when not.
export function ProfileSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { name, setName } = useProfile();
  const email = user?.primaryEmailAddress?.emailAddress;

  const signedIn = isLoaded && isSignedIn;
  if (!signedIn) {
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
        {email ? (
          <View style={styles.fieldRow}>
            <ThemedText style={[typography.settingLabel, { color: colors.textSecondary }]}>
              Email
            </ThemedText>
            <ThemedText style={[typography.settingLabel, { color: colors.text }]}>
              {email}
            </ThemedText>
          </View>
        ) : null}
        <SettingsRow
          icon="log-out"
          title="Log out"
          subtitle="Your entries stay on this device"
          showChevron={false}
          onPress={() => {
            signOut()
              .then(() => navigation.goBack())
              .catch((error) =>
                reportError("account_error", {
                  where: "signOut",
                  detail: error instanceof Error ? error.message : String(error),
                })
              );
          }}
        />
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
