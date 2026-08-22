import { Image, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";

/**
 * Absolute-fill layer rendering the user's selected palette/background image,
 * if any. Screens stay responsible for their base background color.
 */
export function ThemedBackground() {
  const { theme } = useTheme();
  const bgConfig = theme.backgroundConfig;

  if (!bgConfig?.imageSource) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={bgConfig.imageSource}
        style={[StyleSheet.absoluteFill, { opacity: bgConfig.opacity ?? 0.35 }]}
        resizeMode="cover"
      />
    </View>
  );
}
