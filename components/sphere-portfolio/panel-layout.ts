import type { ThemeColor } from "@/lib/default-content"

export type PanelName = "header" | "about" | "projects" | "skills" | "experience" | "education"
export type FocusPanelName = PanelName

export type PanelDefinition = {
  w: number
  h: number
  yaw: number
  pitch: number
  angW: number
}

export type AccentTuple = [L: number, C: number, H: number]

export const PANEL_DEFS: Record<PanelName, PanelDefinition> = {
  header: { w: 1600, h: 300, yaw: 0, pitch: 27, angW: 72 },
  about: { w: 1480, h: 700, yaw: 0, pitch: -3, angW: 60 },
  projects: { w: 1320, h: 880, yaw: 58, pitch: 5, angW: 48 },
  skills: { w: 1320, h: 680, yaw: -58, pitch: 5, angW: 48 },
  experience: { w: 1180, h: 860, yaw: 108, pitch: -1, angW: 44 },
  education: { w: 1180, h: 760, yaw: -108, pitch: -1, angW: 44 },
}

export const PANEL_ORDER: PanelName[] = ["header", "about", "projects", "skills", "experience", "education"]
export const FOCUS_ORDER: FocusPanelName[] = ["about", "projects", "skills", "experience", "education"]

export const DEG = Math.PI / 180
export const SPHERE_RADIUS = 10
export const PANEL_SEGMENTS = 28
export const FOCUS_DIST = 5.2
export const FOCUS_BOW = 0.02
export const FOCUS_FILL = 0.94
export const FOV = 70
export const CURVE_SPREAD = 1.16

export const YAW_CLAMP = 152 * DEG
export const PITCH_MIN = -34 * DEG
export const PITCH_MAX = 40 * DEG

export const panelLabel = (name: PanelName) => name.toUpperCase()

export const hslToRgbUnit = ({ h, s, l }: ThemeColor): [number, number, number] => {
  const saturation = s / 100
  const lightness = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = saturation * Math.min(lightness, 1 - lightness)
  const f = (n: number) =>
    lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

export const hslToAccentTuple = (color: ThemeColor, mode: "dark" | "light"): AccentTuple => {
  const lightness = mode === "dark" ? 0.5 + color.l / 500 : 0.34 + color.l / 650
  const chroma = Math.max(0.08, Math.min(0.24, (color.s / 100) * 0.22))
  return [Number(lightness.toFixed(3)), Number(chroma.toFixed(3)), color.h]
}

export const accentCss = (color: ThemeColor, alpha = 1) =>
  `hsl(${color.h} ${color.s}% ${color.l}% / ${alpha})`
