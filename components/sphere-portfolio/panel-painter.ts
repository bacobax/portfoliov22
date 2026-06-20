import type { PortfolioContent, Project, ProjectCategory, ThemeColor } from "@/lib/default-content"
import type { ThemeMode } from "@/lib/theme"
import {
  PANEL_DEFS,
  type PanelName,
} from "./panel-layout"

const SCALE = 2.5
const FONT = '"Anonymous Pro", "Courier New", monospace'

type PaintColors = {
  acc: (alpha?: number, dL?: number) => string
  solid: string
  bright: string
  fg: string
  fgDim: string
  muted: string
  faint: string
  voidc: string
  panelBg: string
  cardBg: string
  sec: string
  ink: string
  vizBg: string
}

export type MakePanelCanvasOptions = {
  name: PanelName
  content: PortfolioContent | null
  activeCategory: ProjectCategory | null
  activeCategoryIndex: number
  time: Date
  accentColor: ThemeColor
  theme: ThemeMode
}

const clampText = (value: string | undefined | null, fallback: string) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

const initialsFromName = (name: string) => {
  const clean = name.replace(/\.(exe|dev|app)$/i, "").replace(/[_-]+/g, " ")
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "FB"
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

const colors = (accent: ThemeColor, theme: ThemeMode): PaintColors => {
  const acc = (alpha = 1, dL = 0) =>
    `hsl(${accent.h} ${accent.s}% ${Math.max(0, Math.min(100, accent.l + dL * 100))}% / ${alpha})`

  if (theme === "light") {
    return {
      acc,
      solid: acc(1),
      bright: acc(1, 0.1),
      fg: "hsl(222 24% 12%)",
      fgDim: "hsl(222 16% 28%)",
      muted: "hsl(222 10% 44%)",
      faint: "hsl(222 8% 64%)",
      voidc: `hsl(${accent.h} 36% 93%)`,
      panelBg: `hsl(${accent.h} 42% 96%)`,
      cardBg: `hsl(${accent.h} 36% 98%)`,
      sec: `hsl(${accent.h} 30% 90%)`,
      ink: "#fff",
      vizBg: `hsl(${accent.h} 28% 90%)`,
    }
  }

  return {
    acc,
    solid: acc(1),
    bright: acc(1, 0.14),
    fg: "hsl(0 0% 99%)",
    fgDim: "hsl(0 0% 84%)",
    muted: "hsl(0 0% 68%)",
    faint: "hsl(0 0% 48%)",
    voidc: `hsl(${accent.h} 30% 2%)`,
    panelBg: `hsl(${accent.h} 24% 4%)`,
    cardBg: `hsl(${accent.h} 22% 7%)`,
    sec: `hsl(${accent.h} 20% 11%)`,
    ink: "#000",
    vizBg: "#000",
  }
}

const text = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: 400 | 700,
  color: string,
  align: CanvasTextAlign = "left",
  baseline: CanvasTextBaseline = "alphabetic",
) => {
  ctx.font = `${weight === 700 ? "700" : "400"} ${size}px ${FONT}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(value, x, y)
}

const rect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill?: string | null,
  stroke?: string | null,
  lw = 1,
) => {
  if (fill) {
    ctx.fillStyle = fill
    ctx.fillRect(x, y, w, h)
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lw
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw)
  }
}

const measure = (ctx: CanvasRenderingContext2D, value: string, size: number, weight: 400 | 700) => {
  ctx.font = `${weight === 700 ? "700" : "400"} ${size}px ${FONT}`
  return ctx.measureText(value).width
}

const chip = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: string,
  size: number,
  color: string,
  options: { ph?: number; pv?: number; fill?: string | null; lw?: number; textColor?: string } = {},
) => {
  const ph = options.ph ?? 14
  const pv = options.pv ?? 8
  const w = measure(ctx, value, size, 400) + ph * 2
  const h = size + pv * 2
  rect(ctx, x, y, w, h, options.fill ?? null, color, options.lw ?? 1.5)
  text(ctx, value, x + ph, y + h / 2 + 1, size, 400, options.textColor ?? color, "left", "middle")
  return w
}

const dotSquare = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(x, y, s, s)
}

const wrap = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxW: number,
  size: number,
  weight: 400 | 700,
  color: string,
  lh: number,
  maxLines = Number.POSITIVE_INFINITY,
) => {
  ctx.font = `${weight === 700 ? "700" : "400"} ${size}px ${FONT}`
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean)
  let line = ""
  let cy = y
  let lines = 0

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      const isLast = lines + 1 >= maxLines
      text(ctx, isLast ? `${line.slice(0, Math.max(0, line.length - 1))}...` : line, x, cy, size, weight, color)
      lines += 1
      cy += lh
      if (isLast) {
        return cy
      }
      line = word
    } else {
      line = test
    }
  }

  if (line && lines < maxLines) {
    text(ctx, line, x, cy, size, weight, color)
    cy += lh
  }
  return cy
}

const frame = (ctx: CanvasRenderingContext2D, W: number, H: number, C: PaintColors) => {
  rect(ctx, 0, 0, W, H, C.panelBg)
  ctx.save()
  ctx.shadowColor = C.acc(0.5)
  ctx.shadowBlur = 26
  rect(ctx, 6, 6, W - 12, H - 12, null, C.acc(0.6), 2)
  ctx.restore()
  rect(ctx, 6, 6, W - 12, H - 12, null, C.acc(0.22), 1)
  ctx.fillStyle = C.acc(0.012)
  for (let yy = 8; yy < H - 8; yy += 4) {
    ctx.fillRect(8, yy, W - 16, 1)
  }

  ctx.strokeStyle = C.solid
  ctx.lineWidth = 2
  const k = 18
  const m = 14
  ;[
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ].forEach(([cx, cy, sx, sy]) => {
    ctx.beginPath()
    ctx.moveTo(cx, cy + k * sy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx + k * sx, cy)
    ctx.stroke()
  })
}

const card = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, C: PaintColors, borderA = 0.22) => {
  rect(ctx, x, y, w, h, C.cardBg, C.acc(borderA), 1.5)
}

const pulse = (ctx: CanvasRenderingContext2D, x: number, y: number, C: PaintColors) => {
  ctx.fillStyle = C.solid
  ctx.fillRect(x, y, 12, 12)
}

const sun = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78)
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    ctx.stroke()
  }
}

const lock = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, ink: string) => {
  ctx.strokeStyle = color
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.arc(cx, cy - s * 0.18, s * 0.28, Math.PI, 0)
  ctx.stroke()
  rect(ctx, cx - s * 0.4, cy - s * 0.16, s * 0.8, s * 0.62, color)
  ctx.fillStyle = ink
  ctx.fillRect(cx - 2.5, cy + s * 0.02, 5, s * 0.22)
}

const statusAlpha = (status: Project["status"]) => {
  if (status === "PRODUCTION") return 1
  if (status === "BETA" || status === "ONGOING") return 0.72
  if (status === "DEVELOPMENT") return 0.55
  return 0.42
}

const metricEntries = (project: Project) => Object.entries(project.metrics).slice(0, 3)

const paintHeader = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  C: PaintColors,
  options: MakePanelCanvasOptions,
) => {
  frame(ctx, W, H, C)
  const pad = 46
  const midY = H / 2
  text(ctx, ">", pad, midY + 4, 96, 700, C.solid, "left", "middle")
  const lx = pad + 96
  text(ctx, "SYSTEM_PORTFOLIO_v2.0", lx, midY - 18, 54, 700, C.fg)
  text(ctx, options.content ? "STATUS: ONLINE" : "STATUS: LOADING_CONTENT", lx, midY + 36, 28, 400, C.muted)

  let rx = W - pad
  rect(ctx, rx - 44, midY - 22, 44, 44, C.solid)
  rx -= 72
  rect(ctx, rx - 60, midY - 30, 60, 60, C.cardBg, C.acc(0.5), 1.5)
  sun(ctx, rx - 30, midY, 18, C.solid)
  rx -= 76
  rect(ctx, rx - 60, midY - 30, 60, 60, C.cardBg, C.acc(0.5), 1.5)
  lock(ctx, rx - 30, midY, 30, C.solid, C.ink)
  rx -= 88
  const timeString = options.time.toUTCString().slice(17, 25)
  text(ctx, timeString, rx, midY + 2, 30, 400, C.solid, "right", "middle")
  rx -= measure(ctx, timeString, 30, 400) + 30
  text(ctx, "UPTIME: 99.9%", rx, midY + 2, 26, 400, C.muted, "right", "middle")
  rx -= measure(ctx, "UPTIME: 99.9%", 26, 400) + 16
  pulse(ctx, rx - 14, midY - 6, C)
}

const paintAbout = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  C: PaintColors,
  options: MakePanelCanvasOptions,
) => {
  frame(ctx, W, H, C)
  const content = options.content
  const profile = content?.profileData
  const stats = content?.aboutStats
  const pad = 40
  const gap = 22
  const inner = W - pad * 2 - gap
  const lW = Math.round(inner * 0.63)
  const rW = inner - lW
  const top = pad + 8
  const ch = H - top - pad
  const lx = pad
  const rx = pad + lW + gap
  card(ctx, lx, top, lW, ch, C)

  let py = top + 32
  const px = lx + 30
  const av = 130
  rect(ctx, px, py, av, av, C.sec, C.acc(0.6), 1.5)
  const name = clampText(profile?.name, "Portfolio Owner")
  text(ctx, initialsFromName(name), px + av / 2, py + av / 2 + 2, 56, 700, C.solid, "center", "middle")
  const tx = px + av + 26
  text(ctx, name, tx, py + 18, 46, 700, C.fg, "left", "top")
  text(ctx, `> ${clampText(profile?.title, "Full-Stack Developer")}`, tx, py + 70, 26, 400, C.solid, "left", "top")
  const bioEnd = wrap(
    ctx,
    clampText(profile?.bio, "Building AI-powered web systems and immersive 3D interfaces."),
    tx,
    py + 108,
    lW - (tx - lx) - 28,
    23,
    400,
    C.muted,
    30,
    4,
  )

  py = Math.max(py + av + 20, bioEnd + 18)
  const sw = (lW - 60 - 16 * 2) / 3
  const sh = 96
  ;[
    ["PROJECTS", stats?.projects ?? "0"],
    ["COMMITS", stats?.commits ?? "--"],
    ["EXPERIENCE", stats?.experience ?? "--"],
  ].forEach(([label, value], i) => {
    const x = lx + 30 + i * (sw + 16)
    rect(ctx, x, py, sw, sh, C.sec, C.acc(0.18), 1)
    dotSquare(ctx, x + 16, py + 22, 12, C.solid)
    text(ctx, label, x + 36, py + 30, 19, 400, C.muted, "left", "middle")
    text(ctx, value, x + 16, py + 66, 38, 700, C.fg, "left", "middle")
  })

  py += sh + 30
  const buttons: [string, boolean][] = [["CONTACT", true], ["GITHUB", false], ["LINKEDIN", false], ["VIEW & DOWNLOAD CV", false]]
  let bx = lx + 30
  const bh = 50
  buttons.forEach(([label, primary]) => {
    const bw = measure(ctx, label, 23, 400) + 40
    if (bx + bw > lx + lW - 24) {
      bx = lx + 30
      py += bh + 12
    }
    if (primary) {
      rect(ctx, bx, py, bw, bh, C.solid)
      text(ctx, label, bx + bw / 2, py + bh / 2 + 1, 23, 700, C.ink, "center", "middle")
    } else {
      rect(ctx, bx, py, bw, bh, null, C.acc(0.45), 1.5)
      text(ctx, label, bx + bw / 2, py + bh / 2 + 1, 23, 400, C.fgDim, "center", "middle")
    }
    bx += bw + 12
  })

  card(ctx, rx, top, rW, ch, C)
  let sy = top + 36
  const sx = rx + 28
  const sW = rW - 56
  pulse(ctx, sx, sy - 6, C)
  text(ctx, "SYSTEM_STATUS", sx + 24, sy + 2, 24, 400, C.solid, "left", "middle")
  sy += 44
  const statusRows = content?.systemStatus?.slice(0, 4) ?? []
  statusRows.forEach((row) => {
    text(ctx, row.label, sx, sy, 20, 400, C.solid, "left", "top")
    text(ctx, `${row.value}%`, rx + rW - 28, sy, 20, 400, C.solid, "right", "top")
    const ty = sy + 30
    rect(ctx, sx, ty, sW, 16, C.acc(0.1), C.acc(0.3), 1)
    rect(ctx, sx, ty, sW * (row.value / 100), 16, C.solid)
    sy = ty + 42
  })

  sy += 6
  const dh = Math.max(96, top + ch - sy - 26)
  rect(ctx, sx, sy, sW, dh, C.acc(0.08), C.acc(0.3), 1)
  text(ctx, "> LAST_DEPLOYMENT:", sx + 18, sy + 30, 20, 400, C.solid, "left", "middle")
  wrap(ctx, clampText(content?.lastDeployment, "PENDING"), sx + 18, sy + 60, sW - 36, 20, 400, C.muted, 26, 2)
  text(ctx, "> BUILD_STATUS:", sx + 18, sy + dh - 56, 20, 400, C.solid, "left", "middle")
  text(ctx, "SUCCESS", sx + 18, sy + dh - 26, 20, 400, C.solid, "left", "middle")
}

const paintProjects = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  C: PaintColors,
  options: MakePanelCanvasOptions,
) => {
  frame(ctx, W, H, C)
  const category = options.activeCategory
  const pad = 44
  const x0 = pad
  const w0 = W - pad * 2
  let y = pad + 14
  const title = `${clampText(category?.name, "WEB").toUpperCase()}_PROJECTS`
  text(ctx, title, x0, y + 10, 34, 700, C.solid, "left", "top")
  const bw = measure(ctx, title, 34, 700)
  chip(ctx, x0 + bw + 22, y + 4, `${category?.projects.length ?? 0} ACTIVE`, 20, C.solid, { pv: 6 })
  rect(ctx, W - pad - 100, y, 44, 44, null, C.acc(0.5), 1.5)
  text(ctx, "<", W - pad - 78, y + 22, 30, 400, C.solid, "center", "middle")
  rect(ctx, W - pad - 48, y, 44, 44, null, C.acc(0.5), 1.5)
  text(ctx, ">", W - pad - 26, y + 22, 30, 400, C.solid, "center", "middle")
  y += 64
  text(ctx, `${clampText(category?.id, "web").toUpperCase()}  |  PROJECT_CLUSTER`, x0, y, 21, 400, C.muted, "left", "top")
  y += 40

  const vh = 150
  rect(ctx, x0, y, w0, vh, C.vizBg, C.acc(0.2), 1)
  const seeds = [[0.25, 0.3], [0.7, 0.6], [0.5, 0.42], [0.32, 0.74], [0.8, 0.2], [0.62, 0.8], [0.15, 0.55], [0.88, 0.7]]
  seeds.forEach(([fx, fy], i) => {
    const r = 2.5 + (i % 3)
    ctx.fillStyle = C.acc(0.5 - (i % 3) * 0.1)
    ctx.beginPath()
    ctx.arc(x0 + fx * w0, y + fy * vh, r, 0, Math.PI * 2)
    ctx.fill()
  })
  text(ctx, "[ PARTICLE_VISUALIZATION ]", x0 + w0 / 2, y + vh / 2, 20, 400, C.acc(0.4), "center", "middle")
  y += vh + 20

  const projects = category?.projects.slice(0, 2) ?? []
  const cgap = 18
  const cw = (w0 - cgap) / 2
  const ch = H - y - pad
  const visibleProjects = projects.length > 0 ? projects : [{
    title: "NO_PROJECT_DATA",
    status: "DEVELOPMENT" as const,
    description: "Add portfolio projects in editor mode to populate this panel.",
    metrics: { state: "empty" },
    showInCv: true,
  }]

  visibleProjects.forEach((project, i) => {
    const cx = x0 + i * (cw + cgap)
    card(ctx, cx, y, cw, ch, C)
    const ix = cx + 22
    let iy = y + 26
    text(ctx, project.title, ix, iy, 26, 700, C.fg, "left", "top")
    const stw = measure(ctx, project.status, 18, 400) + 22
    rect(ctx, cx + cw - 22 - stw, iy - 2, stw, 30, null, C.acc(statusAlpha(project.status)), 1.5)
    text(ctx, project.status, cx + cw - 22 - stw + 11, iy + 13, 18, 400, C.acc(statusAlpha(project.status)), "left", "middle")
    iy += 50
    iy = wrap(ctx, project.description, ix, iy, cw - 44, 21, 400, C.muted, 30, 5) + 10
    metricEntries(project).forEach(([key, value]) => {
      const label = `${key.toUpperCase()}: `
      const mw = measure(ctx, label, 19, 400)
      text(ctx, label, ix, iy, 19, 400, C.muted, "left", "top")
      text(ctx, value, ix + mw, iy, 19, 400, C.solid, "left", "top")
      iy += 30
    })
  })
}

const paintSkills = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  C: PaintColors,
  options: MakePanelCanvasOptions,
) => {
  frame(ctx, W, H, C)
  const pad = 44
  let y = pad + 14
  text(ctx, "> SKILLS_MATRIX", pad, y + 8, 32, 700, C.solid, "left", "top")
  y += 64
  const skills = options.content?.skillsData
  const cols: [string, string[]][] = [
    ["FRONTEND", skills?.frontend ?? []],
    ["BACKEND", skills?.backend ?? []],
    ["DEVOPS", skills?.devops ?? []],
  ]
  const gap = 32
  const cw = (W - pad * 2 - gap * 2) / 3
  cols.forEach(([title, items], i) => {
    const cx = pad + i * (cw + gap)
    let cy = y
    text(ctx, title, cx, cy, 22, 400, C.solid, "left", "top")
    rect(ctx, cx, cy + 34, cw, 1.5, C.acc(0.4))
    cy += 56
    const visible = items.length > 0 ? items.slice(0, 8) : ["No skills configured"]
    visible.forEach((item) => {
      dotSquare(ctx, cx, cy + 4, 11, C.solid)
      text(ctx, item, cx + 24, cy + 9, 26, 400, C.fg, "left", "middle")
      cy += 46
    })
  })
}

const paintExperience = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  C: PaintColors,
  options: MakePanelCanvasOptions,
) => {
  frame(ctx, W, H, C)
  const pad = 44
  let y = pad + 14
  text(ctx, "> EXPERIENCE_LOG", pad, y + 8, 32, 700, C.solid, "left", "top")
  y += 70
  const entries = options.content?.experienceLog.slice(0, 3) ?? []
  entries.forEach((entry) => {
    const x = pad + 16
    rect(ctx, pad, y, 3, 150, C.solid)
    text(ctx, entry.year, x, y + 4, 20, 400, C.solid, "left", "top")
    text(ctx, entry.title, x, y + 30, 30, 700, C.fg, "left", "top")
    text(ctx, entry.company, x, y + 68, 21, 400, C.muted, "left", "top")
    const ny = wrap(ctx, entry.description, x, y + 100, W - x - pad, 21, 400, C.fgDim, 29, 3)
    let tx = x
    entry.tags.slice(0, 5).forEach((tag) => {
      const tw = chip(ctx, tx, ny + 6, tag, 18, C.acc(0.55), { pv: 6, ph: 12, textColor: C.solid })
      tx += tw + 10
    })
    y += 220
  })
  if (entries.length === 0) {
    text(ctx, "NO_EXPERIENCE_ENTRIES", pad + 16, y + 8, 28, 700, C.fg, "left", "top")
    text(ctx, "Use editor mode to add timeline data.", pad + 16, y + 54, 22, 400, C.muted, "left", "top")
  }
}

const paintEducation = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  C: PaintColors,
  options: MakePanelCanvasOptions,
) => {
  frame(ctx, W, H, C)
  const pad = 44
  let y = pad + 14
  text(ctx, "> EDUCATION_LOG", pad, y + 8, 32, 700, C.solid, "left", "top")
  y += 70
  const entries = options.content?.educationLog.slice(0, 3) ?? []
  entries.forEach((entry) => {
    const x = pad + 16
    rect(ctx, pad, y, 3, 168, C.solid)
    text(ctx, entry.year, x, y + 4, 20, 400, C.solid, "left", "top")
    text(ctx, entry.degree, x, y + 30, 28, 700, C.fg, "left", "top")
    text(ctx, entry.institution, x, y + 66, 21, 400, C.muted, "left", "top")
    const ny = wrap(ctx, entry.description, x, y + 98, W - x - pad, 21, 400, C.fgDim, 29, 3)
    const tag = entry.tags[0] ? `FOCUS: ${entry.tags[0]}` : "ACADEMIC_RECORD"
    chip(ctx, x, ny + 8, tag, 18, C.acc(0.55), { pv: 6, ph: 12, textColor: C.solid })
    y += 240
  })
  if (entries.length === 0) {
    text(ctx, "NO_EDUCATION_RECORDS", pad + 16, y + 8, 28, 700, C.fg, "left", "top")
    text(ctx, "Use editor mode to add education data.", pad + 16, y + 54, 22, 400, C.muted, "left", "top")
  }
}

const painters: Record<PanelName, (ctx: CanvasRenderingContext2D, W: number, H: number, C: PaintColors, options: MakePanelCanvasOptions) => void> = {
  header: paintHeader,
  about: paintAbout,
  projects: paintProjects,
  skills: paintSkills,
  experience: paintExperience,
  education: paintEducation,
}

export const makePanelCanvas = (options: MakePanelCanvasOptions) => {
  const def = PANEL_DEFS[options.name]
  const C = colors(options.accentColor, options.theme)
  const canvas = document.createElement("canvas")
  canvas.width = def.w * SCALE
  canvas.height = def.h * SCALE
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error(`Unable to create canvas context for ${options.name}`)
  }
  ctx.scale(SCALE, SCALE)
  painters[options.name](ctx, def.w, def.h, C, options)
  return canvas
}
