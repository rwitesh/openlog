import { Pressable, StyleSheet, View, type ViewProps } from "react-native";
import { ThemedText } from "@/shared/components/ThemedText";
import { dayOfMonth } from "@/shared/utils/dates";
import { press, radius, space, typography, useEntryPreferences, useTheme } from "@/theme";

const DOT = 7;
const MARKER = 30;

interface RailProps extends ViewProps {
  dayTs: number;
  showDate: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMarkerPress?: () => void;
  children: React.ReactNode;
}

export function TimelineRail({
  dayTs,
  showDate,
  isFirst,
  isLast,
  onMarkerPress,
  children,
  style,
  ...rest
}: RailProps) {
  const { theme, isDark } = useTheme();
  const { timelineStyle, timelineDensity } = useEntryPreferences();
  const { colors } = theme;

  const isRail = timelineStyle === "rail";
  const isMinimal = timelineStyle === "minimal";
  const isClean = timelineStyle === "clean";
  const isCompact = timelineDensity === "compact";

  const showLine = !isClean;
  const lineWidth = isRail ? 2 : 1;
  const dotMarginTop = isCompact ? 5 : 9;
  const center = showDate ? MARKER / 2 : dotMarginTop + DOT / 2;
  const bottomPadding = isCompact ? space.xs + 2 : space.xxl;
  const lineOpacity = isRail ? (isDark ? 0.38 : 0.28) : isDark ? 0.24 : 0.18;

  return (
    <View style={[styles.row, style]} {...rest}>
      <View style={styles.gutter}>
        {showLine ? (
          <View
            style={[
              styles.line,
              {
                width: lineWidth,
                left: (MARKER - lineWidth) / 2,
                top: isFirst ? center : 0,
                bottom: isLast ? center : 0,
                backgroundColor: colors.marker,
                opacity: lineOpacity,
              },
            ]}
          />
        ) : null}

        {showDate ? (
          <Pressable
            onPress={onMarkerPress}
            disabled={!onMarkerPress}
            hitSlop={space.xs}
            style={({ pressed }) => [pressed && onMarkerPress && press]}
            accessibilityLabel={`Open day ${dayOfMonth(dayTs)}`}
          >
            {isRail ? (
              <View style={[styles.dateCircle, { backgroundColor: colors.marker }]}>
                <ThemedText weight="semibold" style={[styles.dateNum, { color: "#FFFFFF" }]}>
                  {dayOfMonth(dayTs)}
                </ThemedText>
              </View>
            ) : isMinimal ? (
              <View
                style={[
                  styles.dateCircleOutline,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.marker,
                  },
                ]}
              >
                <ThemedText weight="semibold" style={[styles.dateNum, { color: colors.text }]}>
                  {dayOfMonth(dayTs)}
                </ThemedText>
              </View>
            ) : (
              <View
                style={[
                  styles.datePillClean,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <ThemedText
                  weight="semibold"
                  style={[styles.dateNumClean, { color: colors.textSecondary }]}
                >
                  {dayOfMonth(dayTs)}
                </ThemedText>
              </View>
            )}
          </Pressable>
        ) : isRail ? (
          <View style={[styles.dot, { marginTop: dotMarginTop, backgroundColor: colors.marker }]} />
        ) : isMinimal ? (
          <View
            style={[
              styles.dotHollow,
              {
                marginTop: dotMarginTop,
                borderColor: colors.textTertiary,
                backgroundColor: colors.background,
              },
            ]}
          />
        ) : null}
      </View>

      <View style={[styles.content, !isLast && { paddingBottom: bottomPadding }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  gutter: {
    width: MARKER,
    alignItems: "center",
    marginRight: space.sm,
  },
  line: {
    position: "absolute",
  },
  dateCircle: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCircleOutline: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  datePillClean: {
    width: MARKER,
    height: MARKER,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNum: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  dateNumClean: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  dot: {
    marginTop: 9,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  dotHollow: {
    marginTop: 9,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
