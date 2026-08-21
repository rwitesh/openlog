import { Feather } from "@expo/vector-icons";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/shared/components/ThemedText";
import { APP_NAME, DEVELOPER_NAME, DEVELOPER_URL } from "@/shared/constants";
import { APP_VERSION } from "@/shared/utils";
import { press, radius, space, useTheme } from "@/theme";

/** About — app identity centered on the page: icon, name, version, and developer contact. */
export function AboutSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;

  const handleOpenDeveloper = () => {
    Linking.openURL(DEVELOPER_URL).catch(() => {});
  };

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
          {APP_NAME}
        </ThemedText>
        {APP_VERSION ? (
          <ThemedText style={[styles.version, { color: colors.textSecondary }]}>
            Version {APP_VERSION}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={handleOpenDeveloper}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel={`Built and maintained by ${DEVELOPER_NAME}`}
          style={({ pressed }) => [styles.developerLink, pressed && { opacity: press.opacity }]}
        >
          <ThemedText style={[styles.developer, { color: colors.textSecondary }]}>
            Built and maintained by{" "}
            <ThemedText weight="medium" style={{ color: colors.accent }}>
              {DEVELOPER_NAME}
            </ThemedText>
          </ThemedText>
          <Feather name="arrow-up-right" size={13} color={colors.accent} style={styles.arrow} />
        </Pressable>
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
  developerLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
  developer: {
    fontSize: 13,
    lineHeight: 18,
  },
  arrow: {
    marginLeft: 2,
  },
});
