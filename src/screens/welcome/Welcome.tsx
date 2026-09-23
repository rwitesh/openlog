import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
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
import { WelcomeShowcase } from "./WelcomeShowcase";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const CTA_BLUE = "#3663E9";

function headerFor(step: Step) {
  switch (step) {
    case "showcase":
      return {
        title: "Welcome",
        subtitle: "Your personal life timeline.",
      };
    case "name":
      return {
        title: "What should we call you?",
        subtitle: "Shown on your entries.",
      };
  }
}

export function WelcomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const flow = useWelcomeAuth(navigation);
  const { step, name, canContinue, canGoBack } = flow;

  if (step === "showcase") {
    return <WelcomeShowcase onFinish={flow.finishShowcase} />;
  }

  const header = headerFor(step);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + space.md,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
      >
        {canGoBack && (
          <Pressable
            onPress={flow.goBackStep}
            style={({ pressed }) => [styles.backButton, pressed && press]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
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

          <TextInput
            value={name}
            onChangeText={flow.setName}
            placeholder="Full name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            maxLength={40}
            onSubmitEditing={flow.submitStep}
            style={inputStyle(colors.text, colors.surfaceMuted, colors.separator)}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={flow.submitStep}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.ctaButton,
              !canContinue && styles.ctaDimmed,
              canContinue && pressed && press,
            ]}
            accessibilityLabel="Save"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
          >
            <ThemedText weight="medium" style={[typography.settingLabel, { color: "#FFFFFF" }]}>
              Save
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  actions: {
    gap: space.md,
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
  ctaDimmed: {
    opacity: 0.55,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    letterSpacing: 2,
  },
});
