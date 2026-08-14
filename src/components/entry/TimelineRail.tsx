import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";

const DOT_SIZE = 7;

interface TimelineRailProps extends ViewProps {
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

/** Dot + vertical line connecting entries for one day. */
export function TimelineRail({ isFirst, isLast, children, style, ...rest }: TimelineRailProps) {
  const { colors } = useTheme().theme;

  return (
    <View style={[styles.row, !isFirst && styles.rowSpaced, style]} {...rest}>
      <View style={styles.gutter}>
        <View
          style={[
            styles.dot,
            { borderColor: colors.marker, backgroundColor: colors.background },
          ]}
        />
        {!isLast ? <View style={[styles.line, { backgroundColor: colors.line }]} /> : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rowSpaced: {
    marginTop: space.lg,
  },
  gutter: {
    width: space.xl,
    alignSelf: "stretch",
    marginRight: space.sm,
  },
  dot: {
    alignSelf: "center",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 1.5,
    marginTop: space.xs,
  },
  line: {
    position: "absolute",
    left: space.xl / 2 - 0.5,
    top: DOT_SIZE + space.xs * 2,
    bottom: 0,
    width: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
