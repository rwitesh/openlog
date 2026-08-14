import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeProvider";
import { motion, press } from "@/theme/motion";
import { metrics, space } from "@/theme/spacing";

interface AddButtonProps {
  onPress: () => void;
}

export function AddButton({ onPress }: AddButtonProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = theme;
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        ...motion.spring,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.normal,
        easing: motion.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      ...motion.spring,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      ...motion.spring,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + space.lg,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.marker },
          pressed && press,
        ]}
        accessibilityLabel="Add entry"
        accessibilityRole="button"
      >
        <Feather name="plus" size={metrics.iconMd} color={colors.background} />
      </Pressable>
    </Animated.View>
  );
}

export const FAB_CLEARANCE = metrics.fabSize + space.lg + space.xl;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: space.xl,
    zIndex: 20,
  },
  btn: {
    width: metrics.fabSize,
    height: metrics.fabSize,
    borderRadius: metrics.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.12)",
  },
});
