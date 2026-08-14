import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";

const DOT_SIZE = 6;

interface TimelineRailProps extends ViewProps {
  isLast: boolean;
  children: React.ReactNode;
}

/** Dot + vertical line connecting entries for one day. */
export function TimelineRail({ isLast, children, style, ...rest }: TimelineRailProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.row, style]} {...rest}>
      <View style={styles.gutter}>
        {!isLast ? (
          <View style={[styles.line, { backgroundColor: colors.line }]} />
        ) : null}
        <View style={[styles.dot, { backgroundColor: colors.marker }]} />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  gutter: {
    width: space.xxl,
    alignItems: "center",
  },
  line: {
    position: "absolute",
    left: space.xxl / 2 - 0.75,
    top: DOT_SIZE + space.sm,
    bottom: 0,
    width: 1.5,
  },
  dot: {
    marginTop: space.sm,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingBottom: space.xxl,
  },
});
