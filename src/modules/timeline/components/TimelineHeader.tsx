import { Animated, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfile } from "@/modules/profile";
import { useTheme } from "@/theme";
import { metrics, sectionGap, space } from "@/theme/spacing";
import { formatMonthYear } from "@/shared/utils/dates";
import { ThemedText } from "@/shared/components/ThemedText";
import { HeaderIconActions } from "./HeaderIconActions";
import { MonthChip } from "./MonthChip";
import { useStaggeredEntrance } from "../hooks/useStaggeredEntrance";

interface TimelineHeaderProps {
  selectedMonth?: number;
  onOpenMonth?: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onLayout: (height: number) => void;
}

export function TimelineHeader({
  selectedMonth,
  onOpenMonth,
  onOpenCalendar,
  onOpenSettings,
  onLayout,
}: TimelineHeaderProps) {
  const { theme, resolvedMode, isDark } = useTheme();
  const { name } = useProfile();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const dark = resolvedMode === "dark";
  const [greetingStyle, subtitleStyle, monthStyle] = useStaggeredEntrance([16, 12, 10]);

  const firstName = name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi, ${firstName}` : "Hi there";
  const currentMonth = formatMonthYear(selectedMonth ?? Date.now());
  const topInset = insets.top + space.lg;
  const hasBackground = Boolean(theme.backgroundConfig?.imageUri);

  return (
    <View
      onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
      style={styles.wrapper}
    >
      <View style={[styles.header, { paddingTop: topInset }]}>
        {/* Protective scrim gradient when a background image is active */}
        {hasBackground ? (
          <LinearGradient
            colors={
              isDark
                ? ["rgba(18, 18, 21, 0.88)", "rgba(18, 18, 21, 0.35)", "transparent"]
                : ["rgba(250, 248, 245, 0.92)", "rgba(250, 248, 245, 0.45)", "transparent"]
            }
            locations={[0, 0.75, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}

        <HeaderIconActions
          top={topInset}
          colors={colors}
          onOpenCalendar={onOpenCalendar}
          onOpenSettings={onOpenSettings}
        />

        <View style={styles.content}>
          <Animated.View style={greetingStyle}>
            <ThemedText
              weight="semibold"
              style={[theme.typography.headerGreeting, { color: colors.text }]}
            >
              {greeting}
            </ThemedText>
          </Animated.View>

          <Animated.View style={[subtitleStyle, styles.subtitleWrap]}>
            <ThemedText style={[theme.typography.headerSubtitle, { color: colors.textSecondary }]}>
              How&apos;s your day going so far?
            </ThemedText>
          </Animated.View>

          <Animated.View style={monthStyle}>
            <MonthChip
              label={currentMonth}
              dark={dark}
              colors={colors}
              onPress={onOpenMonth ?? (() => {})}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    paddingBottom: sectionGap,
    paddingHorizontal: space.lg,
    overflow: "hidden",
  },
  content: {
    alignItems: "flex-start",
    paddingRight: metrics.btnMd * 2 + space.lg,
    marginTop: space.sm,
  },
  subtitleWrap: {
    marginTop: space.xs,
  },
});
