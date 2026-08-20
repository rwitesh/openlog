import { StyleSheet } from "react-native";

import { metrics, radius, space } from "@/theme";

export const chip = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
  },
  iconSlot: {
    width: metrics.iconSm,
    height: metrics.iconSm,
    alignItems: "center",
    justifyContent: "center",
  },
});
