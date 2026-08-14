import { Easing } from "react-native";

/** Shared motion tokens — calm, unhurried transitions. */
/** Shared press feedback — every pressable dims to this. */
export const press = { opacity: 0.65 } as const;

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
