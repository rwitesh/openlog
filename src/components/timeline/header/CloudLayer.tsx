import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const CLOUDS = [
  {
    width: 220,
    height: 120,
    top: -36,
    left: -48,
    light: "rgba(255, 255, 255, 0.92)",
    dark: "rgba(255, 255, 255, 0.09)",
    drift: [0, 10] as const,
  },
  {
    width: 160,
    height: 90,
    top: 8,
    right: -20,
    light: "rgba(255, 255, 255, 0.6)",
    dark: "rgba(233, 230, 221, 0.06)",
    drift: [0, -8] as const,
  },
  {
    width: 140,
    height: 70,
    top: 52,
    left: 96,
    light: "rgba(255, 255, 255, 0.38)",
    dark: "rgba(255, 255, 255, 0.04)",
    drift: null,
  },
] as const;

export function CloudLayer({ dark }: { dark: boolean }) {
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
        const baseStyle = {
          width: cloud.width,
          height: cloud.height,
          top: cloud.top,
          left: "left" in cloud ? cloud.left : undefined,
          right: "right" in cloud ? cloud.right : undefined,
          backgroundColor: dark ? cloud.dark : cloud.light,
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
