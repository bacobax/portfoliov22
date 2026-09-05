import { z } from "zod"

export const CV_DOCUMENT_SCHEMA_VERSION = 1 as const

export const cvDesignSchema = z.object({
  page: z.enum(["A4", "Letter"]).default("A4"),
  marginMm: z.number().min(6).max(30).default(16),
  columns: z.enum(["single", "sidebar"]).default("single"),
  sidebarPosition: z.enum(["left", "right"]).default("left"),
  sidebarWidthMm: z.number().min(38).max(80).default(54),
  fontFamily: z.enum(["sans", "serif", "humanist"]).default("sans"),
  baseFontPt: z.number().min(7).max(13).default(10.5),
  lineHeight: z.number().min(1.1).max(1.9).default(1.35),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0f6c72"),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#17202a"),
  muted: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#5f6973"),
  sectionGapMm: z.number().min(1).max(16).default(5),
  entryGapMm: z.number().min(1).max(12).default(4),
  photoShape: z.enum(["square", "rounded", "circle"]).default("square"),
  appearance: z.enum(["professional", "regional"]).default("professional"),
  datePlacement: z.enum(["right", "left", "above"]).default("right"),
  photoSizeMm: z.number().min(16).max(32).default(22),
  headingStyle: z.enum(["divider", "spacing"]).default("divider"),
  showTaxId: z.boolean().default(false),
  showLocation: z.boolean().default(true),
  locationLabel: z.string().max(160).default(""),
  showProjectStatus: z.boolean().default(false),
  pageBreakBefore: z.array(z.string()).default([]),
})

export type CvDesign = z.infer<typeof cvDesignSchema>

export const defaultCvDesign = (accent = "#0f6c72"): CvDesign =>
  cvDesignSchema.parse({ accent })

/** A deliberate draft action; never rewrites wording or publishes a CV. */
export const professionalCvDesign = (current: CvDesign): CvDesign => ({
  ...defaultCvDesign(current.accent), page: current.page, fontFamily: current.fontFamily,
  ink: current.ink, muted: current.muted, locationLabel: current.locationLabel,
  showLocation: current.showLocation,
})
