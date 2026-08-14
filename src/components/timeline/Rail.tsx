import { Pressable, StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { dayOfMonth } from "@/lib";
import { ThemedText } from "@/components/core/ui";

const DOT = 7;
const MARKER = 32;

interface RailProps extends ViewProps {
  dayTs: number;
  showDate: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMarkerPress?: () => void;
  children: React.ReactNode;
}

export function Rail({
  dayTs,
  showDate,
  isFirst,
  isLast,
  onMarkerPress,
  children,
  style,
  ...rest
}: RailProps) {
  const { colors } = useTheme().theme;

  const center = showDate ? MARKER / 2 : space.sm + DOT / 2;

  return (
    <View style={[styles.row, style]} {...rest}>
      <View style={styles.gutter}>
        <View
          style={[
            styles.line,
            {
              top: isFirst ? center : 0,
              bottom: isLast ? center : 0,
              backgroundColor: colors.line,
            },
          ]}
        />

        {showDate ? (
          <Pressable
            onPress={onMarkerPress}
            disabled={!onMarkerPress}
            hitSlop={space.xs}
            accessibilityLabel={`Open day ${dayOfMonth(dayTs)}`}
          >
            <View style={[styles.dateCircle, { backgroundColor: colors.marker }]}>
              <ThemedText
                weight="semibold"
                style={[styles.dateNum, { color: colors.background }]}
              >
                {dayOfMonth(dayTs)}
              </ThemedText>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.dot, { backgroundColor: colors.marker }]} />
        )}
      </View>

      <View style={[styles.content, !isLast && styles.contentSpaced]}>{children}</View>
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
    marginRight: space.xs,
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
    marginTop: space.sm,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  contentSpaced: {
    paddingBottom: space.lg,
  },
});
