/**
 * Universal spacing scale (4px step). Use these tokens everywhere —
 * no one-off margin/padding numbers in components.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Non-spacing layout dimensions (widths, fixed row heights). */
export const metrics = {
  headerRowHeight: 44,
  dateStripHeight: 56,
  fabSize: 52,
  iconSm: 16,
  iconMd: 20,
} as const;
