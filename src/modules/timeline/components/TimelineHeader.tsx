import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfile } from "@/modules/profile";
import { ThemedText } from "@/shared/components/ThemedText";
import { formatMonthYear } from "@/shared/utils/dates";
import { metrics, space, useTheme } from "@/theme";
import { useStaggeredEntrance } from "../hooks/useStaggeredEntrance";
import { HeaderIconActions } from "./HeaderIconActions";
import { MonthChip } from "./MonthChip";

interface TimelineHeaderProps {
  selectedMonth?: number;
  onOpenMonth?: () => void;
  onOpenSearch: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onLayout?: (height: number) => void;
}

const HEADER_ICON_GAP = space.xs + 2;

export function TimelineHeader({
  selectedMonth,
  onOpenMonth,
  onOpenSearch,
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

  const firstName = name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi, ${firstName}` : "Hi there";
  const currentMonth = formatMonthYear(selectedMonth ?? Date.now());
  const topInset = insets.top + space.lg;

  return (
    <View
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.height) : undefined}
      style={styles.wrapper}
    >
      <View style={[styles.header, { paddingTop: topInset }]}>
        <HeaderIconActions
          top={topInset}
          colors={colors}
          onOpenSearch={onOpenSearch}
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
    zIndex: 10,
  },
  header: {
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
    overflow: "hidden",
  },
  content: {
    alignItems: "flex-start",
    paddingRight: metrics.btnMd * 3 + HEADER_ICON_GAP * 2 + space.lg,
    marginTop: space.sm,
  },
  subtitleWrap: {
    marginTop: space.xs,
  },
});
