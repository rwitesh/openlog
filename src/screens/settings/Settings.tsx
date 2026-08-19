import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import type { RootStackParamList } from "@/navigation/types";
import { usePreferences, useTheme } from "@/theme";
import { useProfile } from "@/modules/profile";
import { useEntries } from "@/modules/entry";
import {
  BiometricLockRow,
  CollapsibleSection,
  SegmentedRow,
} from "@/modules/settings";
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

  const { accessibility, security } = preferences;

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
        summary={name?.trim() ? name.trim() : "Set your name"}
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

      <View
        style={[
          styles.appearanceCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.separator,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.navigate("Appearance")}
          style={({ pressed }) => [styles.appearanceHeader, pressed && press]}
          accessibilityRole="button"
          accessibilityLabel="Appearance settings. Themes, typography & layout. Tap to customize."
        >
          <View style={styles.appearanceTitleGroup}>
            <ThemedText weight="semibold" style={[styles.navTitle, { color: colors.text }]}>
              Appearance
            </ThemedText>
            <ThemedText style={[styles.navSubtitle, { color: colors.textSecondary }]}>
              Themes, typography & layout
            </ThemedText>
          </View>

          <View style={styles.appearanceIconSlot}>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </View>
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
  appearanceCard: {
    marginHorizontal: space.xl,
    marginBottom: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  appearanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
  },
  appearanceTitleGroup: {
    flex: 1,
    gap: 2,
    marginRight: space.md,
  },
  navTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  navSubtitle: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
  appearanceIconSlot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
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
