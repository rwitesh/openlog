import {
  Modal,
  Pressable,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, space, useTheme } from "@/theme";
import { useKeyboardInset } from "./Layout";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** "bottom" slides up like a drawer; "center" is a dialog card; "top" anchors top-left like a dropdown. */
  placement?: "bottom" | "center" | "top";
  animationType?: "slide" | "fade";
  paddingBottom?: number;
  /** Docks a bottom sheet directly above the keyboard. Use for sheets containing text inputs. */
  keyboardBehavior?: "none" | "dock";
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
  keyboardBehavior = "none",
  sheetStyle,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const window = useWindowDimensions();
  const isBottom = placement === "bottom";
  const keyboard = useKeyboardInset();

  const resolvedAnimation = animationType ?? (isBottom ? "slide" : "fade");
  const docksToKeyboard = isBottom && keyboardBehavior === "dock" && keyboard.visible;
  const bottomPad = paddingBottom ?? (docksToKeyboard ? 0 : insets.bottom + space.lg);
  // A docked card must fit in the viewport above the keyboard, rather than retain a
  // height calculated for the full screen and shift its header out of view.
  const dockedMaxHeight = Math.max(0, window.height - keyboard.offset - insets.top);

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
            docksToKeyboard && { marginBottom: keyboard.offset, maxHeight: dockedMaxHeight },
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
