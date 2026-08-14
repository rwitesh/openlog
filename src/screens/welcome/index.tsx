import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/types/navigation";
import { AtmosphericBackground } from "@/components/timeline/header";
import { useProfile } from "@/profile";
import { useTheme } from "@/theme/ThemeProvider";
import { ThemedText } from "@/components/core";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function Welcome({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, resolvedMode } = useTheme();
  const { setName } = useProfile();
  const { colors } = theme;

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
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AtmosphericBackground
        mode={resolvedMode}
        background={colors.background}
        variant="screen"
        style={[
          styles.screen,
          {
            paddingTop: insets.top + space.xxxl,
            paddingBottom: insets.bottom + space.xxxl,
          },
        ]}
      >
        <View style={styles.content}>
          <ThemedText
            weight="semibold"
            style={[typography.headerGreeting, { color: colors.text }]}
          >
            Welcome
          </ThemedText>

          <ThemedText style={[typography.headerSubtitle, { color: colors.textSecondary }]}>
            What should we call you?
          </ThemedText>

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

          <Pressable
            onPress={continueToTimeline}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: canContinue ? colors.marker : colors.line,
                opacity: canContinue ? 1 : 0.5,
              },
              pressed && canContinue && press,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
          >
            <ThemedText
              weight="medium"
              style={[
                typography.settingLabel,
                { color: resolvedMode === "dark" ? colors.background : colors.surface },
              ]}
            >
              Continue
            </ThemedText>
          </Pressable>
        </View>
      </AtmosphericBackground>
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
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
});
