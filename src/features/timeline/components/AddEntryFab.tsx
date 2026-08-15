import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeProvider";
import { motion, press } from "@/theme/motion";
import { metrics, space } from "@/theme/spacing";

interface AddEntryFabProps {
  onPress: () => void;
}

export function AddEntryFab({ onPress }: AddEntryFabProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, motion } = theme;
  const scale = useRef(new Animated.Value(motion.level === "reduced" ? 1 : 0.85)).current;
  const opacity = useRef(new Animated.Value(motion.level === "reduced" ? 1 : 0)).current;

  useEffect(() => {
    if (motion.level === "reduced") {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }

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
  }, [opacity, scale, motion]);

  const handlePressIn = () => {
    if (motion.level === "reduced") return;
    Animated.spring(scale, {
      toValue: 0.92,
      ...motion.spring,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (motion.level === "reduced") return;
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
