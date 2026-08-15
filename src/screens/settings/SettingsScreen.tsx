import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import type { ThemeMode } from "@/theme/types";
import { ACCENT_OPTIONS, THEME_PALETTES } from "@/theme/colors";
import { usePreferences, useTheme } from "@/theme/ThemeProvider";
import { useProfile } from "@/features/profile";
import { useEntries } from "@/features/entry";
import {
  BiometricLockRow,
  CollapsibleSection,
  LiveThemePreview,
  MoodPicker,
  ThemeDropdown,
} from "@/features/settings";
import { space } from "@/theme/spacing";
import { press } from "@/theme/motion";
import { typography, type FontChoice, type TextSize } from "@/theme/typography";
import type {
  AtmosphereIntensity,
  EditorTextSize,
  TimelineDensity,
  TimelineStyle,
} from "@/theme/preferences";
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

interface SegmentItem<T> {
  id: T;
  label: string;
}

function SegmentedRow<T extends string>({
  items,
  selected,
  onSelect,
}: {
  items: SegmentItem<T>[];
  selected: T;
  onSelect: (val: T) => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.segmentTrack, { backgroundColor: colors.surfaceMuted }]}>
      {items.map((item) => {
        const isSelected = item.id === selected;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.segmentItem,
              isSelected && [
                styles.segmentItemSelected,
                { backgroundColor: colors.surface },
              ],
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <ThemedText
              weight={isSelected ? "medium" : "regular"}
              style={[
                styles.segmentLabel,
                { color: isSelected ? colors.text : colors.textSecondary },
              ]}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.toggleRow}>
      <ThemedText style={[typography.settingLabel, { color: colors.text }]}>
        {label}
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.marker }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, resolvedMode } = useTheme();
  const {
    preferences,
    activeMoodName,
    setAppearance,
    setEntry,
    setWriting,
    setAccessibility,
    setSecurity,
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

  const { appearance, entry, writing, accessibility, security } = preferences;

  const currentMoodName = THEME_PALETTES[appearance.palette]?.label ?? "Warm Paper";
  const currentAccentName =
    ACCENT_OPTIONS.find((a) => a.id === appearance.accent)?.label ?? "Default";
  const modeLabel =
    appearance.mode === "system"
      ? "System"
      : appearance.mode === "dark"
        ? "Dark"
        : "Light";

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
      <View style={styles.previewContainer}>
        <LiveThemePreview />
      </View>

      {/* PROFILE */}
      <CollapsibleSection
        title="Profile"
        summary={name ? name : "Set your name"}
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

      {/* MOOD PRESETS */}
      <CollapsibleSection
        title="Mood"
        summary={activeMoodName}
      >
        <MoodPicker />
      </CollapsibleSection>

      {/* APPEARANCE */}
      <CollapsibleSection
        title="Appearance"
        summary={`${currentMoodName} · ${currentAccentName} · ${modeLabel}`}
      >
        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          THEME PALETTE
        </ThemedText>
        <ThemeDropdown
          selectedMood={appearance.palette}
          onSelect={(palette) => setAppearance({ palette })}
        />

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          ACCENT COLOR
        </ThemedText>
        <View style={styles.accentsRow}>
          {ACCENT_OPTIONS.map((item) => {
            const isSelected = appearance.accent === item.id;
            const color = resolvedMode === "dark" ? item.colorDark : item.colorLight;
            const isDefault = item.id === "default";

            return (
              <Pressable
                key={item.id}
                onPress={() => setAppearance({ accent: item.id })}
                style={({ pressed }) => [
                  styles.accentDotWrap,
                  isSelected && { borderColor: color },
                  pressed && press,
                ]}
                accessibilityLabel={`Accent ${item.label}`}
              >
                <View
                  style={[
                    styles.accentDot,
                    {
                      backgroundColor: color,
                      borderWidth: isDefault ? 1 : 0,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  {isSelected ? (
                    <Feather
                      name="check"
                      size={12}
                      color={resolvedMode === "dark" ? "#141310" : "#FBFAF6"}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          APPEARANCE MODE
        </ThemedText>
        <SegmentedRow<ThemeMode>
          items={[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "system", label: "System" },
          ]}
          selected={appearance.mode}
          onSelect={(mode) => setAppearance({ mode })}
        />

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          ATMOSPHERE GRADIENT
        </ThemedText>
        <SegmentedRow<AtmosphereIntensity>
          items={[
            { id: "soft", label: "Soft" },
            { id: "muted", label: "Muted" },
            { id: "off", label: "Off" },
          ]}
          selected={appearance.atmosphere}
          onSelect={(atmosphere) => setAppearance({ atmosphere })}
        />
      </CollapsibleSection>

      {/* TYPOGRAPHY */}
      <CollapsibleSection
        title="Typography"
        summary={`${appearance.fontChoice === "serif" ? "Literary Serif" : "Clean Sans"} · ${
          appearance.textSize.charAt(0).toUpperCase() + appearance.textSize.slice(1)
        }`}
      >
        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          TYPEFACE
        </ThemedText>
        <SegmentedRow<FontChoice>
          items={[
            { id: "sans", label: "Clean Sans" },
            { id: "serif", label: "Literary Serif" },
          ]}
          selected={appearance.fontChoice}
          onSelect={(fontChoice) => setAppearance({ fontChoice })}
        />

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          TEXT SCALE
        </ThemedText>
        <SegmentedRow<TextSize>
          items={[
            { id: "compact", label: "Compact" },
            { id: "regular", label: "Regular" },
            { id: "generous", label: "Generous" },
          ]}
          selected={appearance.textSize}
          onSelect={(textSize) => setAppearance({ textSize })}
        />
      </CollapsibleSection>

      {/* TIMELINE */}
      <CollapsibleSection
        title="Timeline"
        summary={`${
          entry.timelineStyle === "rail"
            ? "Continuous Rail"
            : entry.timelineStyle === "minimal"
              ? "Minimal Dots"
              : "Clean Line"
        } · ${entry.timelineDensity === "compact" ? "Compact" : "Comfortable"}`}
      >
        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          TIMELINE STYLE
        </ThemedText>
        <SegmentedRow<TimelineStyle>
          items={[
            { id: "rail", label: "Rail" },
            { id: "minimal", label: "Minimal" },
            { id: "clean", label: "Clean" },
          ]}
          selected={entry.timelineStyle}
          onSelect={(timelineStyle) => setEntry({ timelineStyle })}
        />

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          TIMELINE DENSITY
        </ThemedText>
        <SegmentedRow<TimelineDensity>
          items={[
            { id: "comfortable", label: "Comfortable" },
            { id: "compact", label: "Compact" },
          ]}
          selected={entry.timelineDensity}
          onSelect={(timelineDensity) => setEntry({ timelineDensity })}
        />

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          METADATA ON TIMELINE
        </ThemedText>
        <ToggleRow
          label="Timestamps"
          value={entry.showTimestamp}
          onValueChange={(showTimestamp) => setEntry({ showTimestamp })}
        />
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <ToggleRow
          label="Location Labels"
          value={entry.showLocation}
          onValueChange={(showLocation) => setEntry({ showLocation })}
        />
      </CollapsibleSection>

      {/* WRITING */}
      <CollapsibleSection
        title="Writing"
        summary={`${
          writing.editorTextSize === "large" ? "Large Editor" : "Standard"
        } · ${writing.autoLocation ? "Auto Location" : "Manual Location"}`}
      >
        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          EDITOR TEXT SIZE
        </ThemedText>
        <SegmentedRow<EditorTextSize>
          items={[
            { id: "regular", label: "Standard" },
            { id: "large", label: "Large" },
          ]}
          selected={writing.editorTextSize}
          onSelect={(editorTextSize) => setWriting({ editorTextSize })}
        />

        <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
          LOCATION ATTACHMENT
        </ThemedText>
        <ToggleRow
          label="Auto-Detect Location on Compose"
          value={writing.autoLocation}
          onValueChange={(autoLocation) => setWriting({ autoLocation })}
        />
      </CollapsibleSection>

      {/* ACCESSIBILITY */}
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

      {/* PRIVACY */}
      <CollapsibleSection
        title="Privacy"
        summary={security.biometricLock ? "App lock on" : "App lock off"}
      >
        <BiometricLockRow />
      </CollapsibleSection>

      {/* DATA */}
      <CollapsibleSection
        title="Data"
        summary="Storage & reset"
      >
        <Pressable
          onPress={confirmDeleteEntries}
          style={({ pressed }) => [styles.deleteBtn, pressed && press]}
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
  previewContainer: {
    paddingHorizontal: space.xl,
  },
  fieldRow: {
    paddingVertical: space.sm,
    gap: space.xs,
  },
  nameInput: {
    paddingVertical: space.xs,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subheading: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  accentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    flexWrap: "wrap",
    marginBottom: space.xs,
  },
  accentDotWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  accentDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  segmentItemSelected: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    paddingVertical: space.sm,
  },
});
