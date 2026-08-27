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

/** Header copy per step; the code step shows the address it was sent to. */
function headerFor(step: Step, intent: "signup" | "login", email: string) {
  const create = intent === "signup";
  switch (step) {
    case "choose":
      return {
        title: "Welcome",
        subtitle:
          "Create an account or log in with just your email. Or skip and use the app without one.",
      };
    case "email":
      return {
        title: create ? "Create new account" : "Log in",
        subtitle: create
          ? "Enter your email address. We will send you a code. No password needed."
          : "Enter your email address. We will send you a code to log in.",
      };
    case "code":
      return {
        title: "Check your email",
        subtitle: `We sent a 6-digit code to ${email.trim()}. Enter it below.`,
      };
    case "name":
      return {
        title: "What should we call you?",
        subtitle: "This name shows on your journal.",
      };
  }
}

export function WelcomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const flow = useWelcomeAuth(navigation);
  const { step, intent, email, code, name, errorMessage, busy, canContinue } = flow;
  const header = headerFor(step, intent, email);

  const ctaLabel =
    step === "choose"
      ? ""
      : step === "email"
        ? intent === "signup"
          ? "Create new account"
          : "Log in"
        : step === "name"
          ? "Save and finish"
          : "Continue";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + space.md,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
      >
        {/* Name is the final gate of an authenticated session: there is no
            meaningful screen behind it to return to. */}
        {step !== "choose" && step !== "name" && (
          <Pressable
            onPress={flow.goBackStep}
            disabled={busy}
            style={({ pressed }) => [styles.backButton, pressed && press]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityState={{ disabled: busy }}
          >
            <Feather name="chevron-left" size={metrics.iconMd} color={colors.text} />
            <ThemedText style={[typography.settingLabel, { color: colors.text }]}>Back</ThemedText>
          </Pressable>
        )}

        <View style={styles.body}>
          <View style={styles.headerBlock}>
            <ThemedText
              weight="semibold"
              style={[typography.headerGreeting, { color: colors.text }]}
            >
              {header.title}
            </ThemedText>
            <ThemedText style={[typography.headerSubtitle, { color: colors.textSecondary }]}>
              {header.subtitle}
            </ThemedText>
          </View>

          {step === "email" ? (
            <TextInput
              value={email}
              onChangeText={flow.setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={flow.submitStep}
              style={inputStyle(colors.text, colors.surfaceMuted, colors.separator)}
            />
          ) : null}

          {step === "code" ? (
            <TextInput
              value={code}
              onChangeText={(text) => flow.setCode(text.replace(/\D/g, ""))}
              placeholder="------"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              returnKeyType="done"
              maxLength={6}
              onSubmitEditing={flow.submitStep}
              style={inputStyle(colors.text, colors.surfaceMuted, colors.separator)}
            />
          ) : null}

          {step === "name" ? (
            <TextInput
              value={name}
              onChangeText={flow.setName}
              placeholder="Full name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={40}
              onSubmitEditing={flow.submitStep}
              style={inputStyle(colors.text, colors.surfaceMuted, colors.separator)}
            />
          ) : null}

          {errorMessage ? (
            <ThemedText
              style={[typography.settingLabel, styles.error, { color: colors.destructive }]}
            >
              {errorMessage}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.actions}>
          {step === "choose" ? (
            <>
              <PrimaryButton
                label="Create new account"
                filled
                onPress={() => flow.startIntent("signup")}
              />
              <PrimaryButton
                label="Log in"
                filled={false}
                onPress={() => flow.startIntent("login")}
              />
              <Pressable
                onPress={flow.exitToApp}
                style={({ pressed }) => [styles.skipButton, pressed && press]}
                accessibilityRole="button"
                accessibilityLabel="Skip for now"
              >
                <ThemedText style={[typography.settingLabel, { color: colors.textSecondary }]}>
                  Skip for now
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              {step === "code" ? (
                <View style={styles.linkRow}>
                  <Pressable
                    onPress={flow.resendCode}
                    style={({ pressed }) => pressed && press}
                    accessibilityRole="button"
                    accessibilityLabel="Send a new code"
                  >
                    <ThemedText style={[typography.settingLabel, { color: colors.accent }]}>
                      Send a new code
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                onPress={flow.submitStep}
                disabled={!canContinue}
                style={({ pressed }) => [styles.ctaButton, canContinue && pressed && press]}
                accessibilityLabel={ctaLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canContinue, busy }}
              >
                {busy ? (
                  <ActivityIndicator color={colors.textTertiary} />
                ) : (
                  <ThemedText
                    weight="medium"
                    style={[
                      typography.settingLabel,
                      { color: canContinue ? "#FFFFFF" : colors.textTertiary },
                    ]}
                  >
                    {ctaLabel}
                  </ThemedText>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Clerk bot protection mount point (required on sign-up flows). */}
      <View nativeID="clerk-captcha" />
    </KeyboardAvoidingView>
  );
}

function PrimaryButton({
  label,
  filled,
  onPress,
}: {
  label: string;
  filled: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ctaButton,
        pressed && press,
        filled
          ? { backgroundColor: CTA_BLUE, borderColor: CTA_BLUE }
          : { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <ThemedText
        weight="medium"
        style={[typography.settingLabel, { color: filled ? "#FFFFFF" : colors.text }]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function inputStyle(color: string, background: string, border: string) {
  return [
    styles.input,
    typography.headerSubtitle,
    { color, backgroundColor: background, borderColor: border },
  ];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    paddingHorizontal: space.xxl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    alignSelf: "flex-start",
    paddingVertical: space.sm,
    paddingRight: space.lg,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    gap: space.lg,
  },
  headerBlock: {
    gap: space.xs,
  },
  error: {
    marginTop: -space.sm,
  },
  actions: {
    gap: space.md,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaButton: {
    height: metrics.btnMd + 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: CTA_BLUE,
    borderColor: CTA_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: space.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    letterSpacing: 2,
  },
});
