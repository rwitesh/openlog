import { StyleSheet } from "react-native";

import { metrics, space } from "@/theme/spacing";
import { radius } from "@/theme/theme";

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
