export const DEFAULT_THEME_COLORS = {
  dark: { h: 180, s: 97, l: 74 },
  // light: { h: 245, s: 100, l: 37 },
  light: { h: 32, s: 87, l: 44 },
} as const

export type ThemeMode = keyof typeof DEFAULT_THEME_COLORS
