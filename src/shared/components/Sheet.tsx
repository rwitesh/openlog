import { Modal, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, space, useTheme } from "@/theme";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** "bottom" slides up like a drawer; "center" is a dialog card; "top" anchors top-left like a dropdown. */
  placement?: "bottom" | "center" | "top";
  animationType?: "slide" | "fade";
  paddingBottom?: number;
  sheetStyle?: StyleProp<ViewStyle>;
}

/** Modal surface with a backdrop — a bottom drawer, dialog card, or dropdown. */
export function Sheet({
  visible,
  onClose,
  children,
  placement = "bottom",
  animationType,
  paddingBottom,
  sheetStyle,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const isBottom = placement === "bottom";

  const resolvedAnimation = animationType ?? (isBottom ? "slide" : "fade");
  const bottomPad = paddingBottom ?? insets.bottom + space.lg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolvedAnimation}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={[
          styles.overlay,
          placement === "center" && styles.overlayCenter,
          placement === "top" && styles.overlayTop,
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <View
          style={[
            isBottom ? styles.bottomCard : placement === "top" ? styles.topCard : styles.centerCard,
            { backgroundColor: colors.surface },
            sheetStyle,
          ]}
        >
          {isBottom ? <View style={[styles.handle, { backgroundColor: colors.line }]} /> : null}
          {children}
          {isBottom && bottomPad > 0 ? <View style={{ height: bottomPad }} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayCenter: {
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  overlayTop: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  bottomCard: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  centerCard: {
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  topCard: {
    borderRadius: radius.md,
    borderTopLeftRadius: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: space.xs,
    borderRadius: space.xs / 2,
    marginBottom: space.md,
  },
});
