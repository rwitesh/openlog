import { useRef } from "react";
import { Animated } from "react-native";

import { motion } from "@/theme/motion";

export function usePressScale(toValue = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  return {
    scale,
    onPressIn: () => {
      Animated.spring(scale, { toValue, ...motion.spring, useNativeDriver: true }).start();
    },
    onPressOut: () => {
      Animated.spring(scale, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
    },
  };
}
