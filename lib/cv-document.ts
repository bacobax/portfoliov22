import { z } from "zod"

export const CV_DOCUMENT_SCHEMA_VERSION = 1 as const

export const cvDesignSchema = z.object({
  page: z.enum(["A4", "Letter"]).default("A4"),
  marginMm: z.number().min(6).max(30).default(18),
  columns: z.enum(["single", "sidebar"]).default("sidebar"),
  sidebarPosition: z.enum(["left", "right"]).default("left"),
  sidebarWidthMm: z.number().min(38).max(80).default(54),
  fontFamily: z.enum(["sans", "serif", "humanist"]).default("sans"),
  baseFontPt: z.number().min(7).max(13).default(9.5),
  lineHeight: z.number().min(1.1).max(1.9).default(1.45),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0f6c72"),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#17202a"),
  muted: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#5f6973"),
  sectionGapMm: z.number().min(1).max(16).default(5),
  entryGapMm: z.number().min(1).max(12).default(4),
  photoShape: z.enum(["square", "rounded", "circle"]).default("square"),
  pageBreakBefore: z.array(z.string()).default([]),
})

export type CvDesign = z.infer<typeof cvDesignSchema>

export const defaultCvDesign = (accent = "#0f6c72"): CvDesign => ({
  page: "A4", marginMm: 18, columns: "sidebar", sidebarPosition: "left",
  sidebarWidthMm: 54, fontFamily: "sans", baseFontPt: 9.5, lineHeight: 1.45,
  accent, ink: "#17202a", muted: "#5f6973", sectionGapMm: 5,
  entryGapMm: 4, photoShape: "square", pageBreakBefore: [],
})
