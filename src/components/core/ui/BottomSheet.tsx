import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme/spacing";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: "bottom" | "center";
  animationType?: "slide" | "fade";
  paddingBottom?: number;
  sheetStyle?: StyleProp<ViewStyle>;
}

/** Shared modal sheet with backdrop — bottom drawer or centered card. */
export function BottomSheet({
  visible,
  onClose,
  children,
  variant = "bottom",
  animationType,
  paddingBottom,
  sheetStyle,
}: BottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  const resolvedAnimation = animationType ?? (variant === "center" ? "fade" : "slide");
  const bottomPad = paddingBottom ?? insets.bottom + space.lg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolvedAnimation}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          variant === "center" && styles.overlayCenter,
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <View
          style={[
            variant === "bottom" ? styles.sheetBottom : styles.sheetCenter,
            {
              backgroundColor: colors.surface,
              paddingBottom: variant === "bottom" ? bottomPad : space.lg,
            },
            sheetStyle,
          ]}
        >
          {variant === "bottom" ? (
            <View style={[styles.handle, { backgroundColor: colors.line }]} />
          ) : null}
          {children}
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
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetBottom: {
    borderTopLeftRadius: space.xl,
    borderTopRightRadius: space.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  sheetCenter: {
    borderRadius: space.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: space.xs,
    borderRadius: space.xs / 2,
    marginBottom: space.lg,
  },
});
