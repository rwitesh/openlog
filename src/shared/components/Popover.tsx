import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";

interface PopoverProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Backdrop tap and system back close the popover. */
  accessibilityLabel?: string;
  cardStyle?: StyleProp<ViewStyle>;
}

/**
 * Compact centered card over a light backdrop — for tooltips and small confirmations.
 */
export function Popover({
  visible,
  onClose,
  children,
  accessibilityLabel = "Close",
  cardStyle,
}: PopoverProps) {
  const { colors } = useTheme().theme;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.separator,
            },
            cardStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: space.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  card: {
    width: "100%",
    maxWidth: 280,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
});
