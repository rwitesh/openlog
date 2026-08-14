import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { metrics, space } from "@/theme/spacing";

interface ImageViewerProps {
  uri: string;
  visible: boolean;
  onClose: () => void;
}

export function ImageViewer({ uri, visible, onClose }: ImageViewerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: "rgba(0,0,0,0.92)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <Pressable
          onPress={onClose}
          hitSlop={space.md}
          style={[styles.closeBtn, { top: insets.top + space.sm }]}
          accessibilityLabel="Close image"
          accessibilityRole="button"
        >
          <Feather name="x" size={metrics.iconMd} color={colors.background} />
        </Pressable>

        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          accessibilityLabel="Full size entry image"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    right: space.lg,
    zIndex: 2,
    width: metrics.btnMd,
    height: metrics.btnMd,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
