import { Easing } from "react-native";

/** Shared motion tokens — calm, unhurried transitions. */
export const motion = {
  fast: 180,
  normal: 320,
  slow: 520,
  spring: {
    damping: 18,
    stiffness: 220,
    mass: 0.8,
  },
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
} as const;
