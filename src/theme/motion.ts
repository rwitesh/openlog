import { Easing } from "react-native";

export type MotionLevel = "full" | "subtle" | "reduced";

export const press = { opacity: 0.65 } as const;

export function createMotion(level: MotionLevel = "subtle") {
  if (level === "reduced") {
    return {
      level,
      fast: 0,
      normal: 0,
      slow: 0,
      spring: {
        damping: 100,
        stiffness: 1000,
        mass: 1,
      },
      easeOut: Easing.linear,
      easeInOut: Easing.linear,
    };
  }

  const multiplier = level === "full" ? 1.2 : 0.9;

  return {
    level,
    fast: Math.round(180 * multiplier),
    normal: Math.round(320 * multiplier),
    slow: Math.round(520 * multiplier),
    spring: {
      damping: level === "full" ? 14 : 20,
      stiffness: level === "full" ? 180 : 240,
      mass: 0.8,
    },
    easeOut: Easing.out(Easing.cubic),
    easeInOut: Easing.inOut(Easing.cubic),
  };
}

export const motion = createMotion("subtle");
