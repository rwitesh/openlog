import { useRef } from "react";
import { Animated } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function usePressScale(toValue = 0.96) {
  const { theme } = useTheme();
  const { motion } = theme;
  const scale = useRef(new Animated.Value(1)).current;

  return {
    scale,
    onPressIn: () => {
      if (motion.level === "reduced") return;
      Animated.spring(scale, { toValue, ...motion.spring, useNativeDriver: true }).start();
    },
    onPressOut: () => {
      if (motion.level === "reduced") return;
      Animated.spring(scale, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
    },
  };
}
