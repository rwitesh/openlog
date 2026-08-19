import { useEffect, useRef } from "react";
import { Animated } from "react-native";

import { motion } from "@/theme/motion";

export function useStaggeredEntrance(offsets: number[]) {
  const values = useRef(offsets.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      90,
      values.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: motion.normal,
          easing: motion.easeOut,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [values]);

  return values.map((value, index) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [offsets[index], 0],
        }),
      },
    ],
  }));
}
