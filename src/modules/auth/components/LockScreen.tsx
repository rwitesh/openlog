import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/shared/components/ThemedText";
import { APP_NAME } from "@/shared/constants";
import { useTheme } from "@/theme";
import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";

interface LockScreenProps {
  /** True while the OS prompt is on screen — the button must not re-trigger it. */
  prompting: boolean;
  onUnlock: () => void;
}

export function LockScreen({ prompting, onUnlock }: LockScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme, resolvedMode } = useTheme();
  const { colors } = theme;
  const dark = resolvedMode === "dark";

  // Symmetric top/bottom padding (the larger of the two insets) so the
  // centered block sits at the optical center — asymmetric insets would
  // bias it toward whichever edge has the smaller inset.
  const edgeInset = Math.max(insets.top, insets.bottom) + space.xxxl;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingTop: edgeInset, paddingBottom: edgeInset }]}>
        <View
          style={[
            styles.lockBadge,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
          ]}
        >
          <Feather name="lock" size={28} color={colors.text} />
        </View>

        <View style={styles.headerBlock}>
          <ThemedText
            weight="semibold"
            style={[typography.headerGreeting, { color: colors.text }]}
          >
            {`${APP_NAME} is locked`}
          </ThemedText>

          <ThemedText style={[typography.headerSubtitle, { color: colors.textSecondary }]}>
            Use biometrics or your passcode to continue.
          </ThemedText>
        </View>

        <Pressable
          onPress={onUnlock}
          disabled={prompting}
          style={({ pressed }) => [
            styles.unlockButton,
            {
              backgroundColor: dark ? colors.accent : colors.text,
              borderColor: dark ? colors.accent : colors.text,
            },
            pressed && !prompting && press,
            prompting && styles.unlockButtonPrompting,
          ]}
          accessibilityLabel={`Unlock ${APP_NAME}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: prompting }}
        >
          <Feather
            name="unlock"
            size={metrics.iconMd}
            color={dark ? colors.background : colors.surface}
          />
          <ThemedText
            weight="medium"
            style={[typography.settingLabel, { color: dark ? colors.background : colors.surface }]}
          >
            {prompting ? "Verifying…" : "Unlock"}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: space.xxl,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xl,
  },
  lockBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBlock: {
    alignItems: "center",
    gap: space.xs,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    height: metrics.btnMd + 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.xxl,
  },
  unlockButtonPrompting: {
    opacity: 0.6,
  },
});
