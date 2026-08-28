import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/ThemedText";
import { metrics, radius, space, useTheme } from "@/theme";
import { HeaderIconActions } from "./HeaderIconActions";

interface TimelineHeaderProps {
  onOpenSearch: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onLayout?: (height: number) => void;
}

export function TimelineHeader({
  onOpenSearch,
  onOpenCalendar,
  onOpenSettings,
  onLayout,
}: TimelineHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const topInset = insets.top + space.sm;

  return (
    <View
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.height) : undefined}
      style={styles.wrapper}
    >
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={styles.brandLockup}>
          <View
            style={[
              styles.iconWrap,
              { borderColor: colors.separator, backgroundColor: colors.surface },
            ]}
          >
            <Image
              source={require("../../../../assets/icon.png")}
              style={styles.icon}
              resizeMode="cover"
            />
          </View>
          <ThemedText weight="semibold" style={[styles.brandTitle, { color: colors.text }]}>
            OpenLog
          </ThemedText>
        </View>

        <HeaderIconActions
          colors={colors}
          onOpenSearch={onOpenSearch}
          onOpenCalendar={onOpenCalendar}
          onOpenSettings={onOpenSettings}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  brandLockup: {
    flexDirection: "row",
    alignItems: "center",
    height: metrics.btnLg,
    gap: space.sm + 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  brandTitle: {
    fontFamily: "BricolageGrotesque-Bold",
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
});
