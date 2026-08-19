import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/navigation/types";
import { useProfile } from "@/modules/profile";
import { useTheme } from "@/theme";
import { ThemedText } from "@/shared/components/ThemedText";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, resolvedMode } = useTheme();
  const { setName } = useProfile();
  const { colors } = theme;
  const dark = resolvedMode === "dark";

  const [value, setValue] = useState("");
  const canContinue = value.trim().length > 0;

  const continueToTimeline = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setName(trimmed);
    navigation.replace("Timeline");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + space.xxxl,
            paddingBottom: insets.bottom + space.xxxl,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <ThemedText
              weight="semibold"
              style={[typography.headerGreeting, { color: colors.text }]}
            >
              Welcome
            </ThemedText>

            <ThemedText style={[typography.headerSubtitle, { color: colors.textSecondary }]}>
              What should we call you?
            </ThemedText>
          </View>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={continueToTimeline}
            maxLength={40}
            style={[
              styles.input,
              typography.headerSubtitle,
              {
                color: colors.text,
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.separator,
              },
            ]}
          />

          <View style={styles.actionRow}>
            <Pressable
              onPress={continueToTimeline}
              disabled={!canContinue}
              style={({ pressed }) => [
                styles.arrowButton,
                {
                  backgroundColor: canContinue
                    ? colors.accent
                    : dark
                      ? "rgba(255, 255, 255, 0.08)"
                      : colors.surfaceMuted,
                  borderColor: canContinue ? colors.accent : colors.separator,
                },
                pressed && canContinue && press,
              ]}
              accessibilityLabel="Continue to timeline"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canContinue }}
            >
              <Feather
                name="arrow-right"
                size={metrics.iconMd}
                color={
                  canContinue
                    ? dark
                      ? colors.background
                      : colors.surface
                    : colors.textTertiary
                }
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    paddingHorizontal: space.xxl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: space.lg,
  },
  headerBlock: {
    gap: space.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
  },
  actionRow: {
    alignItems: "flex-end",
    marginTop: space.xs,
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
