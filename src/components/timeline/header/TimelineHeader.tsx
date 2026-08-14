import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfile } from "@/profile";
import { useTheme } from "@/theme/ThemeProvider";
import { metrics, sectionGap, space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatMonthYear } from "@/lib";
import { ThemedText } from "@/components/core";
import { AtmosphericBackground } from "./AtmosphericBackground";
import { HeaderIconActions } from "./HeaderIconActions";
import { MonthChip } from "./MonthChip";
import { useStaggeredEntrance } from "./useStaggeredEntrance";

interface TimelineHeaderProps {
  selectedMonth?: number;
  onOpenMonth?: () => void;
  onOpenMonthPicker?: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onLayout: (height: number) => void;
}

export function TimelineHeader({
  selectedMonth,
  onOpenMonth,
  onOpenMonthPicker,
  onOpenCalendar,
  onOpenSettings,
  onLayout,
}: TimelineHeaderProps) {
  const { theme, resolvedMode } = useTheme();
  const { name } = useProfile();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const dark = resolvedMode === "dark";
  const [greetingStyle, subtitleStyle, monthStyle] = useStaggeredEntrance([16, 12, 10]);

  const greeting = name ? `Hi, ${name}` : "Hi there";
  const currentMonth = formatMonthYear(selectedMonth ?? Date.now());
  const topInset = insets.top + space.lg;

  return (
    <View
      onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
      style={styles.wrapper}
    >
      <AtmosphericBackground
        mode={resolvedMode}
        background={colors.background}
        style={[styles.header, { paddingTop: topInset }]}
      >
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
              onPress={onOpenMonth ?? onOpenMonthPicker ?? (() => {})}
            />
          </Animated.View>
        </View>
      </AtmosphericBackground>
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
