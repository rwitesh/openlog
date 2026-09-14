import type { TagColorId } from "@/shared/types";

const colors: Record<
  TagColorId,
  { light: string; dark: string; lightTint: string; darkTint: string }
> = {
  clay: { light: "#A64C38", dark: "#E5826D", lightTint: "#F6E3DD", darkTint: "#3A2420" },
  amber: { light: "#9A650F", dark: "#E7A83D", lightTint: "#F6ECD5", darkTint: "#382A16" },
  sage: { light: "#3E724C", dark: "#77B887", lightTint: "#E1EEE3", darkTint: "#203427" },
  violet: { light: "#6844A2", dark: "#AD8BE8", lightTint: "#EBE4F6", darkTint: "#2C223D" },
  teal: { light: "#18776F", dark: "#59BFB5", lightTint: "#DDF0ED", darkTint: "#1C3431" },
  rose: { light: "#A14365", dark: "#DF7F9E", lightTint: "#F4E0E7", darkTint: "#392128" },
};

export function tagColors(colorId: TagColorId, isDark: boolean) {
  const color = colors[colorId];
  return {
    foreground: isDark ? color.dark : color.light,
    background: isDark ? color.darkTint : color.lightTint,
  };
}
