import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/shared/components/ThemedText";
import { APP_VERSION } from "@/shared/utils";
import { radius, space, useTheme } from "@/theme";

/** About — app identity centered on the page: icon, name, version. */
export function AboutSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          // Top safe area is already consumed by the native header; only the
          // home-indicator inset remains, so content centers in the visible area.
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.center}>
        <View style={[styles.iconWrap, { borderColor: colors.separator }]}>
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.icon}
            resizeMode="cover"
          />
        </View>

        <ThemedText weight="semibold" style={[styles.appName, { color: colors.text }]}>
          Kizuna
        </ThemedText>
        {APP_VERSION ? (
          <ThemedText style={[styles.version, { color: colors.textSecondary }]}>
            Version {APP_VERSION}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: space.md,
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 0.3,
  },
  version: {
    fontSize: 14,
    lineHeight: 20,
  },
});
