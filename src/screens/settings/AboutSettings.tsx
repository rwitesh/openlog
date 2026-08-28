import { Image, Linking, StyleSheet, View } from "react-native";
import { SettingsGroup, SettingsRow, SettingsScreenScroll } from "@/modules/settings";
import { ThemedText } from "@/shared/components/ThemedText";
import { APP_NAME, PRIVACY_POLICY_URL, TERMS_URL, WEBSITE_URL } from "@/shared/constants";
import { APP_VERSION } from "@/shared/utils";
import { radius, space, typography, useTheme } from "@/theme";

/** About — app branding, version, website link, and legal documents. */
export function AboutSettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SettingsScreenScroll>
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            { borderColor: colors.separator, backgroundColor: colors.surface },
          ]}
        >
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.icon}
            resizeMode="cover"
          />
        </View>

        <ThemedText weight="semibold" style={[styles.appName, { color: colors.text }]}>
          {APP_NAME}
        </ThemedText>

        <ThemedText style={[styles.tagline, { color: colors.textSecondary }]}>
          Keep writing simple, your life on a timeline.
        </ThemedText>

        {APP_VERSION ? (
          <View
            style={[
              styles.versionBadge,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
            ]}
          >
            <ThemedText
              weight="medium"
              style={[styles.versionText, { color: colors.textSecondary }]}
            >
              Version {APP_VERSION}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <SettingsGroup label="LINKS &amp; RESOURCES">
        <SettingsRow
          icon="globe"
          title="Website"
          subtitle="rwitesh.github.io/openlog"
          onPress={() => openUrl(WEBSITE_URL)}
        />

        <SettingsRow
          icon="shield"
          title="Privacy Policy"
          subtitle="Everything stays on your device"
          onPress={() => openUrl(PRIVACY_POLICY_URL)}
        />

        <SettingsRow
          icon="file-text"
          title="Terms and Conditions"
          subtitle="Usage terms and guidelines"
          onPress={() => openUrl(TERMS_URL)}
        />
      </SettingsGroup>

      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: colors.textTertiary }]}>
          Keep writing simple · Your life on a timeline
        </ThemedText>
      </View>
    </SettingsScreenScroll>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: space.sm,
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
    marginTop: 2,
  },
  versionBadge: {
    marginTop: space.sm,
    paddingHorizontal: space.md - 2,
    paddingVertical: space.xs - 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  versionText: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
  footer: {
    alignItems: "center",
    marginTop: space.xxl,
    paddingHorizontal: space.lg,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
