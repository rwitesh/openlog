import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/types";
import { ThemedText } from "@/shared/components/ThemedText";
import { metrics, press, radius, space, typography, useTheme } from "@/theme";
import { type Step, useWelcomeAuth } from "./useWelcomeAuth";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const CTA_BLUE = "#3663E9";

export function WelcomeScreen({ navigation }: Props) {
  const { theme, resolvedMode } = useTheme();
  const { colors } = theme;
  const dark = resolvedMode === "dark";

  const flow = useWelcomeAuth(navigation);
  const {
    step,
    intent,
    email,
    setEmail,
    code,
    setCode,
    name,
    setName,
    errorMessage,
    busy,
    canContinue,
  } = flow;

  const header: Record<Exclude<Step, "choose">, { title: string; subtitle: string }> = {
    email:
      intent === "signup"
        ? {
            title: "Create new account",
            subtitle: "Enter your email address. We will send you a code. No password needed.",
          }
        : {
            title: "Log in",
            subtitle: "Enter your email address. We will send you a code to log in.",
          },
    code: {
      title: "Check your email",
      subtitle: `We sent a 6-digit code to ${email.trim()}. Enter it below.`,
    },
    name: {
      title: "What should we call you?",
      subtitle: "This name shows on your journal.",
    },
  };

  return (
    <ScreenFrame>
      {step === "choose" ? (
        <ChooseStep onStart={flow.startIntent} onSkip={flow.exitToApp} />
      ) : (
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <ThemedText
              weight="semibold"
              style={[typography.headerGreeting, { color: colors.text }]}
            >
              {header[step].title}
            </ThemedText>
            <ThemedText style={[typography.headerSubtitle, { color: colors.textSecondary }]}>
              {header[step].subtitle}
            </ThemedText>
          </View>

          {step === "email" ? (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={flow.submitEmail}
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
          ) : null}

          {step === "code" ? (
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              returnKeyType="done"
              onSubmitEditing={flow.submitCode}
              maxLength={6}
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
          ) : null}

          {step === "name" ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={flow.submitName}
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
          ) : null}

          {errorMessage ? (
            <ThemedText style={[typography.settingLabel, { color: colors.destructive }]}>
              {errorMessage}
            </ThemedText>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={flow.submitStep}
              disabled={!canContinue}
              style={({ pressed }) => [
                styles.arrowButton,
                {
                  backgroundColor: canContinue
                    ? CTA_BLUE
                    : dark
                      ? "rgba(255, 255, 255, 0.08)"
                      : colors.surfaceMuted,
                  borderColor: canContinue ? CTA_BLUE : colors.separator,
                },
                pressed && canContinue && press,
              ]}
              accessibilityLabel="Continue"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canContinue, busy }}
            >
              {busy ? (
                <ActivityIndicator color={colors.textTertiary} />
              ) : (
                <Feather
                  name="arrow-right"
                  size={metrics.iconMd}
                  color={canContinue ? "#FFFFFF" : colors.textTertiary}
                />
              )}
            </Pressable>
          </View>

          {step === "code" ? (
            <View style={styles.linkRow}>
              <Pressable
                onPress={flow.resendCode}
                disabled={busy}
                style={({ pressed }) => pressed && press}
                accessibilityRole="button"
                accessibilityLabel="Send a new code"
              >
                <ThemedText style={[typography.settingLabel, { color: colors.accent }]}>
                  Send a new code
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={flow.editEmail}
                style={({ pressed }) => pressed && press}
                accessibilityRole="button"
                accessibilityLabel="Use a different email"
              >
                <ThemedText style={[typography.settingLabel, { color: colors.textSecondary }]}>
                  Use a different email
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={flow.goBackStep}
            style={({ pressed }) => [styles.textButton, pressed && press]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ThemedText style={[typography.settingLabel, { color: colors.textTertiary }]}>
              Back
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Clerk bot protection mount point (required on sign-up flows). */}
      <View nativeID="clerk-captcha" />
    </ScreenFrame>
  );
}

function ScreenFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
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
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

function ChooseStep({
  onStart,
  onSkip,
}: {
  onStart: (intent: "signup" | "login") => void;
  onSkip: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.content}>
      <View style={styles.headerBlock}>
        <ThemedText weight="semibold" style={[typography.headerGreeting, { color: colors.text }]}>
          Welcome
        </ThemedText>
        <ThemedText style={[typography.headerSubtitle, { color: colors.textSecondary }]}>
          Create an account or log in with just your email. Or skip and use the app without one.
        </ThemedText>
      </View>

      <View style={styles.choiceStack}>
        <Pressable
          onPress={() => onStart("signup")}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: CTA_BLUE, borderColor: CTA_BLUE },
            pressed && press,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create new account"
        >
          <ThemedText weight="medium" style={[typography.settingLabel, { color: "#FFFFFF" }]}>
            Create new account
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => onStart("login")}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
            pressed && press,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          <ThemedText weight="medium" style={[typography.settingLabel, { color: colors.text }]}>
            Log in
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={onSkip}
          style={({ pressed }) => [styles.textButton, pressed && press]}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
        >
          <ThemedText style={[typography.settingLabel, { color: colors.textSecondary }]}>
            Skip for now
          </ThemedText>
        </Pressable>
      </View>
    </View>
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
  choiceStack: {
    gap: space.md,
    marginTop: space.md,
  },
  primaryButton: {
    height: metrics.btnMd + 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    alignItems: "center",
    paddingVertical: space.sm,
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
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
