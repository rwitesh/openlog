import { useAuth, useUser } from "@clerk/expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";

import { useProfile } from "@/modules/profile";
import { SettingsGroup, SettingsRow, SettingsScreenScroll } from "@/modules/settings";
import type { RootStackParamList } from "@/navigation/types";
import { ThemedText } from "@/shared/components/ThemedText";
import { logDevWarning } from "@/shared/utils";
import { space, typography, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsProfile">;

/** Profile category screen: the signed-in account. The hub row routes signed-out
 *  users straight to onboarding, so this screen always has an account to show. */
export function ProfileSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { name } = useProfile();
  const email = user?.primaryEmailAddress?.emailAddress;

  const signedIn = isLoaded && isSignedIn;
  if (!signedIn) return null;

  return (
    <SettingsScreenScroll>
      <SettingsGroup label="ACCOUNT">
        {name?.trim() ? (
          <View style={styles.fieldRow}>
            <ThemedText style={[typography.settingLabel, { color: colors.textSecondary }]}>
              Name
            </ThemedText>
            <ThemedText style={[typography.settingLabel, { color: colors.text }]}>
              {name.trim()}
            </ThemedText>
          </View>
        ) : null}
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
              .catch((error) => logDevWarning("profile:signOut", error));
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
});
