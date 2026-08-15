import { Pressable, StyleSheet, View, type ViewProps } from "react-native";

import { useJournalPreferences, useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { press } from "@/theme/motion";
import { dayOfMonth } from "@/shared/utils/dates";
import { ThemedText } from "@/shared/components/ThemedText";

const DOT = 6;
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
  const { theme } = useTheme();
  const { timelineStyle, timelineDensity } = useJournalPreferences();
  const { colors } = theme;

  const center = showDate ? MARKER / 2 : 9 + DOT / 2;
  const showLine = timelineStyle !== "clean";
  const lineOpacity = timelineStyle === "minimal" ? 0.35 : 1;
  const bottomPadding = timelineDensity === "compact" ? space.md : space.xl;

  return (
    <View style={[styles.row, style]} {...rest}>
      <View style={styles.gutter}>
        {showLine ? (
          <View
            style={[
              styles.line,
              {
                top: isFirst ? center : 0,
                bottom: isLast ? center : 0,
                backgroundColor: colors.line,
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
            <View
              style={[
                styles.dateCircle,
                {
                  backgroundColor:
                    timelineStyle === "clean" ? colors.surfaceMuted : colors.marker,
                  borderColor:
                    timelineStyle === "clean" ? colors.separator : colors.marker,
                  borderWidth: timelineStyle === "clean" ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <ThemedText
                weight="semibold"
                style={[
                  styles.dateNum,
                  {
                    color:
                      timelineStyle === "clean" ? colors.text : colors.background,
                  },
                ]}
              >
                {dayOfMonth(dayTs)}
              </ThemedText>
            </View>
          </Pressable>
        ) : (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: colors.marker,
                opacity: timelineStyle === "minimal" ? 0.65 : 1,
              },
            ]}
          />
        )}
      </View>

      <View
        style={[
          styles.content,
          !isLast && { paddingBottom: bottomPadding },
        ]}
      >
        {children}
      </View>
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
    left: (MARKER - 1) / 2,
    width: 1,
  },
  dateCircle: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNum: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  dot: {
    marginTop: 9,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
