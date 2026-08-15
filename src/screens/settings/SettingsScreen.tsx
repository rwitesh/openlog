import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";

import type { RootStackParamList } from "@/navigation/types";
import { usePreferences, useTheme } from "@/theme/ThemeProvider";
import { useProfile } from "@/features/profile";
import { useEntries } from "@/features/entry";
import {
  BiometricLockRow,
  CollapsibleSection,
  SegmentedRow,
  ToggleRow,
} from "@/features/settings";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import type { MotionLevel } from "@/theme/motion";
import { deleteMediaList } from "@/services/media";
import { ThemedText } from "@/shared/components/ThemedText";

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

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const {
    preferences,
    setWriting,
    setAccessibility,
  } = usePreferences();
  const { name, setName } = useProfile();
  const { clearAll } = useEntries();
  const { colors } = theme;

  const confirmDeleteEntries = () =>
    confirmDestructive(
      "Delete all entries?",
      "This permanently removes every entry and its attached media. This cannot be undone.",
      "Delete",
      async () => deleteMediaList(await clearAll())
    );

  /**
   * Auto-Detect Location asks for permission once here — compose
   * then attaches places silently instead of popping a dialog on open.
   */
  const handleAutoLocationToggle = (autoLocation: boolean) => {
    if (!autoLocation) {
      setWriting({ autoLocation: false });
      return;
    }

    void Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        setWriting({ autoLocation: true });
      } else {
        Alert.alert(
          "Location unavailable",
          "Allow location access in system settings to auto-detect places while writing."
        );
      }
    });
  };

  const { writing, accessibility, security } = preferences;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: space.md,
        paddingBottom: insets.bottom + space.xxxl,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <CollapsibleSection
        title="Profile"
        summary={name ? name : "Set your name"}
        defaultExpanded={true}
      >
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
      </CollapsibleSection>

      <View style={styles.navRowSection}>
        <Pressable
          onPress={() => navigation.navigate("Appearance")}
          style={({ pressed }) => [
            styles.appearanceNavRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.separator,
            },
            pressed && press,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Appearance settings. Themes, typography & layout. Tap to customize."
        >
          <View style={styles.appearanceNavLeft}>
            <ThemedText weight="semibold" style={[styles.navTitle, { color: colors.text }]}>
              Appearance
            </ThemedText>
            <ThemedText style={[styles.navSubtitle, { color: colors.textSecondary }]}>
              Themes, typography & layout
            </ThemedText>
          </View>

          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <CollapsibleSection
        title="Accessibility"
        summary={
          accessibility.motionLevel === "full"
            ? "Full Motion"
            : accessibility.motionLevel === "reduced"
              ? "Reduced Motion"
              : "Subtle Motion"
        }
      >
        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          ANIMATION LEVEL
        </ThemedText>
        <SegmentedRow<MotionLevel>
          items={[
            { id: "full", label: "Full" },
            { id: "subtle", label: "Subtle" },
            { id: "reduced", label: "Reduced" },
          ]}
          selected={accessibility.motionLevel}
          onSelect={(motionLevel) => setAccessibility({ motionLevel })}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Privacy"
        summary={security.biometricLock ? "App lock on" : "App lock off"}
      >
        <BiometricLockRow />

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          LOCATION ATTACHMENT
        </ThemedText>
        <ToggleRow
          label="Auto-Detect Location"
          subtitle="Silently attaches city while writing"
          value={writing.autoLocation}
          onValueChange={handleAutoLocationToggle}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Data"
        summary="Storage & reset"
      >
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
      </CollapsibleSection>
    </ScrollView>
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
  navRowSection: {
    paddingHorizontal: space.lg,
    marginVertical: space.xs,
  },
  appearanceNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appearanceNavLeft: {
    flex: 1,
    gap: 3,
    paddingRight: space.sm,
  },
  navTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  navSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  appearanceNavRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  palettePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  paletteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  palettePillText: {
    fontSize: 11,
    lineHeight: 14,
  },
  subheading: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: space.xs,
  },
  deleteBtn: {
    paddingVertical: space.sm,
  },
});
