import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { ThemeColors } from "@/theme/colors";

const CLOUDS = [
  {
    width: 220,
    height: 120,
    top: -36,
    left: -48,
    opacityLight: 0.92,
    opacityDark: 0.09,
    drift: [0, 10] as const,
  },
  {
    width: 160,
    height: 90,
    top: 8,
    right: -20,
    opacityLight: 0.6,
    opacityDark: 0.06,
    drift: [0, -8] as const,
  },
  {
    width: 140,
    height: 70,
    top: 52,
    left: 96,
    opacityLight: 0.38,
    opacityDark: 0.04,
    drift: null,
  },
] as const;

interface CloudLayerProps {
  dark: boolean;
  colors?: ThemeColors;
}

export function CloudLayer({ dark, colors }: CloudLayerProps) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CLOUDS.map((cloud) => {
        const bg = dark
          ? colors?.surfaceMuted ?? "rgb(255, 255, 255)"
          : colors?.surface ?? "rgb(255, 255, 255)";
        const opacity = dark ? cloud.opacityDark : cloud.opacityLight;

        const baseStyle = {
          width: cloud.width,
          height: cloud.height,
          top: cloud.top,
          left: "left" in cloud ? cloud.left : undefined,
          right: "right" in cloud ? cloud.right : undefined,
          backgroundColor: bg,
          opacity,
        };

        if (!cloud.drift) {
          return <View key={cloud.top} style={[styles.cloud, baseStyle]} />;
        }

        return (
          <Animated.View
            key={cloud.top}
            style={[
              styles.cloud,
              baseStyle,
              {
                transform: [
                  {
                    translateX: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [...cloud.drift],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: "absolute",
    borderRadius: 999,
  },
});
