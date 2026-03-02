import { z } from "zod"

/**
 * CV-specific content stored independently in MongoDB.
 * Every field is optional — when absent the CV preview
 * falls back to the matching portfolio value.
 */

/* ── Experience entry (CV-specific) ── */
export interface CvExperienceEntry {
  /** stable id so we can distinguish portfolio-synced vs custom entries */
  id: string
  year: string
  title: string
  company: string
  description: string
  tags: string[]
  /** "portfolio" = synced from portfolio, "custom" = unique to CV */
  source: "portfolio" | "custom"
  /** If synced, index in portfolio experienceLog this was cloned from */
  portfolioIndex?: number
}

/* ── Education entry (CV-specific) ── */
export interface CvEducationEntry {
  id: string
  year: string
  degree: string
  institution: string
  description: string
  tags: string[]
  source: "portfolio" | "custom"
  portfolioIndex?: number
}

/* ── Project entry (CV-specific) ── */
export interface CvProjectEntry {
  id: string
  title: string
  category: string
  description: string
  status: string
  metrics: Record<string, string>
  githubUrl?: string
  showInCv: boolean
  source: "portfolio" | "custom"
  /** category-id + project index in portfolio, for linkage */
  portfolioCategoryId?: string
  portfolioProjectIndex?: number
}

/* ── Full CV content document ── */
export interface CvContent {
  /** Profile overrides */
  name?: string
  title?: string
  summary?: string
  location?: string
  email?: string
  phone?: string
  piva?: string
  links?: { label: string; url: string }[]

  /** Skills overrides (each category array is optional) */
  skills?: Record<string, string[]>

  /** Experience — fully independent list */
  experience: CvExperienceEntry[]

  /** Education — fully independent list */
  education: CvEducationEntry[]

  /** Projects — fully independent list */
  projects: CvProjectEntry[]

  /** Simple arrays */
  certs: string[]
  languages: string[]
  awards: string[]
  publications: string[]

  /** Which layout preset is active */
  activeLayout?: string
}

/* ── Zod schemas for validation ── */

const cvExperienceSchema = z.object({
  id: z.string(),
  year: z.string(),
  title: z.string(),
  company: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  source: z.enum(["portfolio", "custom"]),
  portfolioIndex: z.number().int().nonnegative().optional(),
})

const cvEducationSchema = z.object({
  id: z.string(),
  year: z.string(),
  degree: z.string(),
  institution: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  source: z.enum(["portfolio", "custom"]),
  portfolioIndex: z.number().int().nonnegative().optional(),
})

const cvProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  status: z.string(),
  metrics: z.record(z.string()),
  githubUrl: z.string().nullable().optional().transform((v) => v ?? undefined),
  showInCv: z.boolean(),
  source: z.enum(["portfolio", "custom"]),
  portfolioCategoryId: z.string().nullable().optional().transform((v) => v ?? undefined),
  portfolioProjectIndex: z.number().int().nonnegative().optional(),
})

export const cvContentSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  piva: z.string().optional(),
  links: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .optional(),
  skills: z.record(z.array(z.string())).optional(),
  experience: z.array(cvExperienceSchema).default([]),
  education: z.array(cvEducationSchema).default([]),
  projects: z.array(cvProjectSchema).default([]),
  certs: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  awards: z.array(z.string()).default([]),
  publications: z.array(z.string()).default([]),
  activeLayout: z.string().optional(),
})

export type PersistedCvContent = z.infer<typeof cvContentSchema>

/** Create an empty CvContent with no overrides */
export function emptyCvContent(): CvContent {
  return {
    experience: [],
    education: [],
    projects: [],
    certs: [],
    languages: [],
    awards: [],
    publications: [],
  }
}
