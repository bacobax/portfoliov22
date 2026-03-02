import { z } from "zod"

/* ═══════════════════════════════════════════════════
   Generic, section-based CV content model.
   Every section is one of five types:
     log          ─ timeline entries (experience, education…)
     tags         ─ grouped tag chips (skills…)
     text         ─ plain paragraph (profile summary…)
     links        ─ labelled URLs
     simple-list  ─ flat string list (languages, certs…)
   ═══════════════════════════════════════════════════ */

/* ── Section types ── */
export type CvSectionType = "log" | "tags" | "text" | "links" | "simple-list"

/* ── Section-specific entry types ── */
export interface CvLogEntry {
  id: string
  title: string
  subtitle: string
  dateStart: string
  dateEnd: string
  description: string
  tags: string[]
  url?: string
}

export interface CvTagGroup {
  category: string
  items: string[]
}

export interface CvLinkItem {
  label: string
  url: string
}

/* ── Discriminated union for section data ── */
export type CvSectionData =
  | { type: "log"; entries: CvLogEntry[] }
  | { type: "tags"; groups: CvTagGroup[] }
  | { type: "text"; content: string }
  | { type: "links"; items: CvLinkItem[] }
  | { type: "simple-list"; items: string[] }

/* ── A single section ── */
export interface CvSection {
  id: string
  title: string
  type: CvSectionType
  placement: "sidebar" | "main"
  visible: boolean
  data: CvSectionData
}

/* ── Full CV content document ── */
export interface CvContent {
  name?: string
  title?: string
  cvDescription?: string
  location?: string
  email?: string
  phone?: string
  piva?: string
  sections: CvSection[]
}

/* ── Zod schemas ── */

const cvLogEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  dateStart: z.string(),
  dateEnd: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  url: z.string().optional(),
})

const cvSectionDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("log"),
    entries: z.array(cvLogEntrySchema),
  }),
  z.object({
    type: z.literal("tags"),
    groups: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  }),
  z.object({
    type: z.literal("text"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("links"),
    items: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
  z.object({
    type: z.literal("simple-list"),
    items: z.array(z.string()),
  }),
])

const cvSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["log", "tags", "text", "links", "simple-list"]),
  placement: z.enum(["sidebar", "main"]),
  visible: z.boolean(),
  data: cvSectionDataSchema,
})

export const cvContentSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  cvDescription: z.string().optional(),
  location: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  piva: z.string().optional(),
  sections: z.array(cvSectionSchema).default([]),
})

export type PersistedCvContent = z.infer<typeof cvContentSchema>

/* ── Default section set for a new empty CV ── */
export function defaultSections(): CvSection[] {
  return [
    { id: "profile", title: "Profile", type: "text", placement: "sidebar", visible: true, data: { type: "text", content: "" } },
    { id: "skills", title: "Skills", type: "tags", placement: "sidebar", visible: true, data: { type: "tags", groups: [] } },
    { id: "languages", title: "Languages", type: "simple-list", placement: "sidebar", visible: true, data: { type: "simple-list", items: [] } },
    { id: "certs", title: "Certifications", type: "simple-list", placement: "sidebar", visible: true, data: { type: "simple-list", items: [] } },
    { id: "links", title: "Links", type: "links", placement: "sidebar", visible: true, data: { type: "links", items: [] } },
    { id: "experience", title: "Experience", type: "log", placement: "main", visible: true, data: { type: "log", entries: [] } },
    { id: "projects", title: "Projects", type: "log", placement: "main", visible: true, data: { type: "log", entries: [] } },
    { id: "education", title: "Education", type: "log", placement: "main", visible: true, data: { type: "log", entries: [] } },
    { id: "awards", title: "Awards", type: "simple-list", placement: "main", visible: true, data: { type: "simple-list", items: [] } },
    { id: "publications", title: "Publications", type: "simple-list", placement: "main", visible: true, data: { type: "simple-list", items: [] } },
  ]
}

/** Create an empty CvContent with default section skeleton */
export function emptyCvContent(): CvContent {
  return { sections: defaultSections() }
}

/* ═══════════════════════════════════════════
   Migration: old fixed-field format → sections
   ═══════════════════════════════════════════ */

const _uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/**
 * Given a raw MongoDB object, detect the legacy format
 * (has `experience` array at the top level but no `sections`)
 * and convert to the new section-based format.
 * Returns the object ready for Zod validation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateCvContent(raw: Record<string, any>): Record<string, unknown> {
  // Already new format
  if (Array.isArray(raw.sections) && raw.sections.length > 0) return raw

  const sections: CvSection[] = []

  // ── sidebar sections ──

  if (raw.summary) {
    sections.push({
      id: "profile",
      title: "Profile",
      type: "text",
      placement: "sidebar",
      visible: true,
      data: { type: "text", content: String(raw.summary) },
    })
  }

  if (raw.skills && typeof raw.skills === "object" && Object.keys(raw.skills).length > 0) {
    sections.push({
      id: "skills",
      title: "Skills",
      type: "tags",
      placement: "sidebar",
      visible: true,
      data: {
        type: "tags",
        groups: Object.entries(raw.skills as Record<string, string[]>).map(([category, items]) => ({
          category,
          items: Array.isArray(items) ? items : [],
        })),
      },
    })
  }

  if (Array.isArray(raw.languages) && raw.languages.length > 0) {
    sections.push({
      id: "languages",
      title: "Languages",
      type: "simple-list",
      placement: "sidebar",
      visible: true,
      data: { type: "simple-list", items: raw.languages },
    })
  }

  if (Array.isArray(raw.certs) && raw.certs.length > 0) {
    sections.push({
      id: "certs",
      title: "Certifications",
      type: "simple-list",
      placement: "sidebar",
      visible: true,
      data: { type: "simple-list", items: raw.certs },
    })
  }

  if (Array.isArray(raw.links) && raw.links.length > 0) {
    sections.push({
      id: "links",
      title: "Links",
      type: "links",
      placement: "sidebar",
      visible: true,
      data: { type: "links", items: raw.links },
    })
  }

  // ── main sections ──

  if (Array.isArray(raw.experience) && raw.experience.length > 0) {
    sections.push({
      id: "experience",
      title: "Experience",
      type: "log",
      placement: "main",
      visible: true,
      data: {
        type: "log",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entries: raw.experience.map((e: any) => ({
          id: e.id || _uid(),
          title: e.title || "",
          subtitle: e.company || "",
          dateStart: e.year || "",
          dateEnd: "",
          description: e.description || "",
          tags: Array.isArray(e.tags) ? e.tags : [],
        })),
      },
    })
  }

  if (Array.isArray(raw.projects) && raw.projects.length > 0) {
    sections.push({
      id: "projects",
      title: "Projects",
      type: "log",
      placement: "main",
      visible: true,
      data: {
        type: "log",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entries: raw.projects.filter((p: any) => p.showInCv !== false).map((p: any) => ({
          id: p.id || _uid(),
          title: p.title || "",
          subtitle: p.category || "",
          dateStart: p.status || "",
          dateEnd: "",
          description: p.description || "",
          tags: Object.entries(p.metrics || {}).map(([k, v]) => `${k}: ${v}`),
          url: p.githubUrl || undefined,
        })),
      },
    })
  }

  if (Array.isArray(raw.education) && raw.education.length > 0) {
    sections.push({
      id: "education",
      title: "Education",
      type: "log",
      placement: "main",
      visible: true,
      data: {
        type: "log",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entries: raw.education.map((e: any) => ({
          id: e.id || _uid(),
          title: e.degree || "",
          subtitle: e.institution || "",
          dateStart: e.year || "",
          dateEnd: "",
          description: e.description || "",
          tags: Array.isArray(e.tags) ? e.tags : [],
        })),
      },
    })
  }

  if (Array.isArray(raw.awards) && raw.awards.length > 0) {
    sections.push({
      id: "awards",
      title: "Awards",
      type: "simple-list",
      placement: "main",
      visible: true,
      data: { type: "simple-list", items: raw.awards },
    })
  }

  if (Array.isArray(raw.publications) && raw.publications.length > 0) {
    sections.push({
      id: "publications",
      title: "Publications",
      type: "simple-list",
      placement: "main",
      visible: true,
      data: { type: "simple-list", items: raw.publications },
    })
  }

  // If nothing was migrated, return default sections
  if (sections.length === 0) {
    return {
      name: raw.name,
      title: raw.title,
      cvDescription: raw.cvDescription,
      location: raw.location,
      email: raw.email,
      phone: raw.phone,
      piva: raw.piva,
      sections: defaultSections(),
    }
  }

  return {
    name: raw.name,
    title: raw.title,
    cvDescription: raw.cvDescription,
    location: raw.location,
    email: raw.email,
    phone: raw.phone,
    piva: raw.piva,
    sections,
  }
}
