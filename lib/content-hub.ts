import { z } from "zod"

import {
  cvContentSchema,
  cvProfileExtrasSchema,
  cvSectionDataSchema,
  type CvContent,
  type CvLogEntry,
  type CvProfileExtras,
  type CvSectionData,
} from "@/lib/cv-content"
import {
  cvPresetSchema,
  type CvPreset,
} from "@/lib/cv-presets"
import { cvDesignSchema, defaultCvDesign, type CvDesign } from "@/lib/cv-document"
import {
  COUNTRY_LOCALES,
  CV_COUNTRIES,
  CV_LOCALES,
  CV_TEMPLATE_BY_ID,
  CV_TEMPLATE_IDS,
  inferCvCountry,
  type CvCountry,
  type CvLayoutId,
  type CvLocale,
  type CvRegionalOptions,
} from "@/lib/cv-templates"
import {
  persistedPortfolioContentSchema,
  portfolioContentSchema,
  withDefaultCustomColor,
  type EducationEntry,
  type ExperienceEntry,
  type PersistedPortfolioContent,
  type PortfolioContent,
  type Project,
  type ProjectCategory,
  type SkillsData,
} from "@/lib/default-content"

export const CONTENT_HUB_COLLECTION = "content_hub"
export const CONTENT_HUB_ID = "primary"
export const CONTENT_HUB_SCHEMA_VERSION = 3 as const

export type CvBindingSource =
  | "profile"
  | "skills"
  | "links"
  | "experience"
  | "projects"
  | "education"
  | "shared"

export interface SharedCvSection {
  id: string
  title: string
  type: CvSectionData["type"]
  data: CvSectionData
}

export interface CvPresetSectionConfig {
  id: string
  source: CvBindingSource
  sourceId?: string
  title: string
  titleMode?: "template" | "custom"
  type: CvSectionData["type"]
  placement: "sidebar" | "main"
  visible: boolean
  itemIds: string[]
  localData?: CvSectionData
  localEntries?: CvLogEntry[]
  entryOrder?: string[]
}

export interface CvEntityOverride {
  title?: string
  subtitle?: string
  dateStart?: string
  dateEnd?: string
  description?: string
  tags?: string[]
  url?: string
}

export interface CvContentOverrides {
  name?: string
  title?: string
  location?: string
  email?: string
  phone?: string
  piva?: string
  profileExtras?: CvProfileExtras
}

export interface CvPresetConfig {
  id: string
  name: string
  layout: CvLayoutId
  targetCountry: CvCountry
  documentLanguage: CvLocale
  templateVersion: number
  targetRoleOverride?: string
  summaryOverride?: string
  regionalOptions: CvRegionalOptions
  visible: boolean
  design: CvDesign
  contentOverrides: CvContentOverrides
  sections: CvPresetSectionConfig[]
  overrides: Record<string, CvEntityOverride>
}

export interface ContentHubDocument {
  _id: typeof CONTENT_HUB_ID
  schemaVersion: typeof CONTENT_HUB_SCHEMA_VERSION
  revision: number
  createdAt: string
  updatedAt: string
  portfolio: PortfolioContent
  cvProfileExtras: CvProfileExtras
  sharedSections: SharedCvSection[]
  presets: CvPresetConfig[]
  publishedPresets: CvPreset[]
  publicationInitialized: boolean
}

const sharedCvSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  titleMode: z.enum(["template", "custom"]).optional(),
  type: z.enum(["log", "tags", "text", "links", "simple-list"]),
  data: cvSectionDataSchema,
})

const cvPresetSectionConfigSchema = z.object({
  id: z.string().min(1),
  source: z.enum([
    "profile",
    "skills",
    "links",
    "experience",
    "projects",
    "education",
    "shared",
  ]),
  sourceId: z.string().optional(),
  title: z.string(),
  titleMode: z.enum(["template", "custom"]).optional(),
  type: z.enum(["log", "tags", "text", "links", "simple-list"]),
  placement: z.enum(["sidebar", "main"]),
  visible: z.boolean(),
  itemIds: z.array(z.string()),
  localData: cvSectionDataSchema.optional(),
  localEntries: z.array(z.object({
    id: z.string(), showcaseVisible: z.boolean().optional(), title: z.string(),
    subtitle: z.string(), dateStart: z.string(), dateEnd: z.string(),
    description: z.string(), tags: z.array(z.string()), url: z.string().optional(),
  })).optional(),
  entryOrder: z.array(z.string()).optional(),
})

const cvPresetConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  layout: z.enum(CV_TEMPLATE_IDS),
  targetCountry: z.enum(CV_COUNTRIES),
  documentLanguage: z.enum(CV_LOCALES),
  templateVersion: z.number().int().positive(),
  targetRoleOverride: z.string().optional(),
  summaryOverride: z.string().optional(),
  regionalOptions: z.object({
    showPhoto: z.boolean(),
    personalFields: z.array(z.enum([
      "dateOfBirth", "placeOfBirth", "nationality", "workAuthorization",
      "drivingLicences", "references",
    ])),
    showSignature: z.boolean(),
    documentDate: z.string(),
    customFooter: z.string(),
  }),
  visible: z.boolean(),
  design: cvDesignSchema.default(defaultCvDesign()),
  contentOverrides: z.object({
    name: z.string().optional(), title: z.string().optional(), location: z.string().optional(),
    email: z.string().optional(), phone: z.string().optional(), piva: z.string().optional(),
    profileExtras: cvProfileExtrasSchema.optional(),
  }).default({}),
  sections: z.array(cvPresetSectionConfigSchema),
  overrides: z.record(
    z.object({
      title: z.string().optional(), subtitle: z.string().optional(),
      dateStart: z.string().optional(), dateEnd: z.string().optional(),
      description: z.string().optional(), tags: z.array(z.string()).optional(),
      url: z.string().optional(),
    }),
  ),
}).superRefine((preset, ctx) => {
  if (!COUNTRY_LOCALES[preset.targetCountry].includes(preset.documentLanguage)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentLanguage"],
      message: `${preset.documentLanguage} is not offered for ${preset.targetCountry}`,
    })
  }
})

export const contentHubDocumentSchema = z.object({
  _id: z.literal(CONTENT_HUB_ID),
  schemaVersion: z.literal(CONTENT_HUB_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  portfolio: portfolioContentSchema,
  cvProfileExtras: cvProfileExtrasSchema,
  sharedSections: z.array(sharedCvSectionSchema),
  presets: z.array(cvPresetConfigSchema),
  publishedPresets: z.array(cvPresetSchema).default([]),
  publicationInitialized: z.boolean().default(false),
})

const entityKindSchema = z.enum(["experience", "education", "project"])

const visibilityTargetSchema = z.object({
  entityType: entityKindSchema,
  entityId: z.string(),
  showcase: z.boolean(),
  presetIds: z.array(z.string()),
})

export const editorOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("replace-portfolio"),
    content: persistedPortfolioContentSchema,
    visibility: z.array(visibilityTargetSchema).optional(),
  }),
  z.object({
    type: z.literal("replace-presets"),
    presets: z.array(cvPresetSchema),
    activePresetId: z.string().optional(),
  }),
  z.object({
    type: z.literal("set-visibility"),
    target: visibilityTargetSchema,
  }),
  z.object({
    type: z.literal("delete-entity"),
    entityType: entityKindSchema,
    entityId: z.string(),
  }),
  z.object({
    type: z.literal("publish-cv"),
    presetId: z.string().min(1),
  }),
])

export const editorPatchSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  operations: z.array(editorOperationSchema).min(1),
})

export type EditorOperation = z.infer<typeof editorOperationSchema>
export type EditorPatch = z.infer<typeof editorPatchSchema>

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const normalizedKey = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

const compactHash = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export const stableContentId = (
  namespace: string,
  values: unknown[],
  index = 0,
): string =>
  `${namespace}-${compactHash(`${namespace}|${values.map(normalizedKey).join("|")}|${index}`)}`

const uniqueId = (preferred: string, used: Set<string>): string => {
  let candidate = preferred
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${preferred}-${suffix}`
    suffix += 1
  }
  used.add(candidate)
  return candidate
}

export function normalizePortfolioForHub(
  content: PersistedPortfolioContent | PortfolioContent,
): PortfolioContent {
  const hydrated = withDefaultCustomColor(content as PersistedPortfolioContent)
  const next = clone(hydrated)
  const used = new Set<string>()

  next.contactData.links = next.contactData.links.map((link, index) => ({
    ...link,
    id: uniqueId(
      link.id || stableContentId("link", [link.label, link.url], index),
      used,
    ),
  }))
  next.experienceLog = next.experienceLog.map((entry, index) => ({
    ...entry,
    id: uniqueId(
      entry.id || stableContentId("experience", [entry.title, entry.company], index),
      used,
    ),
    showcaseVisible: entry.showcaseVisible !== false,
  }))
  next.educationLog = next.educationLog.map((entry, index) => ({
    ...entry,
    id: uniqueId(
      entry.id || stableContentId("education", [entry.degree, entry.institution], index),
      used,
    ),
    showcaseVisible: entry.showcaseVisible !== false,
  }))
  next.projectCategories = next.projectCategories.map((category) => ({
    ...category,
    projects: category.projects.map((project, index) => ({
      ...project,
      id: uniqueId(
        project.id ||
          stableContentId("project", [category.id, project.title], index),
        used,
      ),
      showcaseVisible: project.showcaseVisible !== false,
    })),
  }))
  return next
}

const splitYear = (year: string): { dateStart: string; dateEnd: string } => {
  const parts = year.split(/\s*[-–]\s*/)
  return {
    dateStart: parts[0]?.trim() || year,
    dateEnd: parts.slice(1).join(" - ").trim(),
  }
}

const skillGroups = (skills: SkillsData) =>
  [
    { category: "AI Tools", items: skills.aiTools ?? [] },
    { category: "AI Systems", items: skills.aiSystems ?? [] },
    { category: "Frontend", items: skills.frontend },
    { category: "Backend", items: skills.backend },
    { category: "DevOps", items: skills.devops },
  ].filter((group) => group.items.length > 0)

const allProjects = (
  portfolio: PortfolioContent,
): Array<{ project: Project; category: ProjectCategory }> =>
  portfolio.projectCategories.flatMap((category) =>
    category.projects.map((project) => ({ project, category })),
  )

const entryOverride = (
  preset: CvPresetConfig,
  entityId: string,
): CvEntityOverride => preset.overrides[entityId] ?? {}

const experienceLogEntry = (
  entry: ExperienceEntry,
  preset: CvPresetConfig,
): CvLogEntry => {
  const dates = splitYear(entry.year)
  const override = entryOverride(preset, entry.id || "")
  return {
    id: entry.id || "",
    title: override.title ?? entry.title,
    subtitle: override.subtitle ?? entry.company,
    dateStart: override.dateStart ?? dates.dateStart,
    dateEnd: override.dateEnd ?? dates.dateEnd,
    description:
      override.description ?? entry.cvDescription?.trim() ?? entry.description,
    tags: override.tags ?? [...entry.tags],
    url: override.url,
  }
}

const educationLogEntry = (
  entry: EducationEntry,
  preset: CvPresetConfig,
): CvLogEntry => {
  const dates = splitYear(entry.year)
  const override = entryOverride(preset, entry.id || "")
  return {
    id: entry.id || "",
    title: override.title ?? entry.degree,
    subtitle: override.subtitle ?? entry.institution,
    dateStart: override.dateStart ?? dates.dateStart,
    dateEnd: override.dateEnd ?? dates.dateEnd,
    description:
      override.description ?? entry.cvDescription?.trim() ?? entry.description,
    tags: override.tags ?? [...entry.tags],
    url: override.url,
  }
}

const projectLogEntry = (
  project: Project,
  category: ProjectCategory,
  preset: CvPresetConfig,
): CvLogEntry => {
  const override = entryOverride(preset, project.id || "")
  return {
    id: project.id || "",
    title: override.title ?? project.title,
    subtitle: override.subtitle ?? category.name,
    dateStart: override.dateStart ?? project.status,
    dateEnd: override.dateEnd ?? "",
    description:
      override.description ?? project.cvDescription?.trim() ?? project.description,
    tags: override.tags ?? Object.entries(project.metrics).map(([key, value]) => `${key}: ${value}`),
    url: override.url ?? project.projectUrl ?? project.githubUrl,
  }
}

const resolveSectionData = (
  hub: ContentHubDocument,
  preset: CvPresetConfig,
  section: CvPresetSectionConfig,
): CvSectionData => {
  if (section.localData) return clone(section.localData)
  const ordered = (entries: CvLogEntry[]): CvLogEntry[] => {
    if (!section.entryOrder?.length) return entries
    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    return [...section.entryOrder.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []), ...entries.filter((entry) => !section.entryOrder!.includes(entry.id))]
  }
  switch (section.source) {
    case "profile":
      return { type: "text", content: hub.portfolio.profileData.bio }
    case "skills":
      return { type: "tags", groups: skillGroups(hub.portfolio.skillsData) }
    case "links":
      return {
        type: "links",
        items: hub.portfolio.contactData.links.map(({ label, url }) => ({
          label,
          url,
        })),
      }
    case "experience":
      return {
        type: "log",
        entries: ordered([...section.itemIds.flatMap((id) => {
          const entry = hub.portfolio.experienceLog.find((item) => item.id === id)
          return entry ? [experienceLogEntry(entry, preset)] : []
        }), ...(section.localEntries ?? [])]),
      }
    case "education":
      return {
        type: "log",
        entries: ordered([...section.itemIds.flatMap((id) => {
          const entry = hub.portfolio.educationLog.find((item) => item.id === id)
          return entry ? [educationLogEntry(entry, preset)] : []
        }), ...(section.localEntries ?? [])]),
      }
    case "projects":
      return {
        type: "log",
        entries: ordered([...section.itemIds.flatMap((id) => {
          const found = allProjects(hub.portfolio).find(({ project }) => project.id === id)
          return found ? [projectLogEntry(found.project, found.category, preset)] : []
        }), ...(section.localEntries ?? [])]),
      }
    case "shared": {
      const shared = hub.sharedSections.find((item) => item.id === section.sourceId)
      return shared?.data ?? { type: "simple-list", items: [] }
    }
  }
}

export function materializeCvPreset(
  hub: ContentHubDocument,
  preset: CvPresetConfig,
): CvPreset {
  const contact = hub.portfolio.contactData
  const contentOverrides = preset.contentOverrides ?? {}
  const content: CvContent = {
    name: contentOverrides.name ?? hub.portfolio.profileData.name,
    title: contentOverrides.title ?? hub.portfolio.profileData.title,
    location: contentOverrides.location ?? contact.location,
    email: contentOverrides.email ?? contact.email,
    phone: contentOverrides.phone ?? contact.phone,
    piva: contentOverrides.piva ?? contact.piva,
    profileExtras: contentOverrides.profileExtras ?? hub.cvProfileExtras,
    sections: preset.sections.map((section) => ({
      id: section.id,
      title: section.title,
      titleMode: section.titleMode,
      type: section.type,
      placement: section.placement,
      visible: section.visible,
      data: resolveSectionData(hub, preset, section),
    })),
  }
  return {
    id: preset.id,
    name: preset.name,
    layout: preset.layout,
    targetCountry: preset.targetCountry,
    documentLanguage: preset.documentLanguage,
    templateVersion: preset.templateVersion,
    targetRoleOverride: preset.targetRoleOverride,
    summaryOverride: preset.summaryOverride,
    regionalOptions: clone(preset.regionalOptions),
    visible: preset.visible,
    design: preset.design ?? defaultCvDesign(CV_TEMPLATE_BY_ID[preset.layout].accent),
    content: cvContentSchema.parse(content),
  }
}

export function materializeCvPresets(hub: ContentHubDocument): CvPreset[] {
  return hub.presets.map((preset) => materializeCvPreset(hub, preset))
}

export function publicCvPresets(hub: ContentHubDocument): CvPreset[] {
  const presets = hub.publicationInitialized ? hub.publishedPresets : materializeCvPresets(hub)
  return clone(presets).filter((preset) => preset.visible)
}

export function canonicalCvSeedFromHub(hub: ContentHubDocument): CvContent {
  const country = inferCvCountry(hub.portfolio.contactData.location)
  const seenShared = new Set<string>()
  const sharedConfigs = hub.presets.flatMap((preset) => preset.sections.flatMap((section) => {
    if (section.source !== "shared" || !section.sourceId || seenShared.has(section.sourceId)) return []
    seenShared.add(section.sourceId)
    return [{ ...clone(section), visible: true }]
  }))
  for (const section of hub.sharedSections) {
    if (seenShared.has(section.id)) continue
    sharedConfigs.push({
      id: section.id,
      source: "shared",
      sourceId: section.id,
      title: section.title,
      titleMode: "custom",
      type: section.type,
      placement: "main",
      visible: true,
      itemIds: [],
    })
  }
  const seed: CvPresetConfig = {
    id: "canonical-seed",
    name: "Canonical seed",
    layout: "southern_european",
    targetCountry: country,
    documentLanguage: "en",
    templateVersion: 1,
    regionalOptions: clone(CV_TEMPLATE_BY_ID.southern_european.defaultOptions),
    visible: false,
    design: defaultCvDesign(CV_TEMPLATE_BY_ID.southern_european.accent),
    contentOverrides: {},
    sections: [
      ...defaultSectionConfigs(hub.portfolio),
      ...sharedConfigs,
    ],
    overrides: {},
  }
  return materializeCvPreset(hub, seed).content
}

const sourceForSection = (sectionId: string): CvBindingSource => {
  if (
    [
      "profile",
      "skills",
      "links",
      "experience",
      "projects",
      "education",
    ].includes(sectionId)
  ) {
    return sectionId as CvBindingSource
  }
  return "shared"
}

const entityMaps = (portfolio: PortfolioContent) => ({
  experience: new Map(
    portfolio.experienceLog.map((entry) => [
      `${normalizedKey(entry.title)}|${normalizedKey(entry.company)}`,
      entry,
    ]),
  ),
  education: new Map(
    portfolio.educationLog.map((entry) => [
      `${normalizedKey(entry.degree)}|${normalizedKey(entry.institution)}`,
      entry,
    ]),
  ),
  projects: new Map(
    allProjects(portfolio).map(({ project, category }) => [
      `${normalizedKey(project.title)}|${normalizedKey(category.name)}`,
      project,
    ]),
  ),
})

const defaultSectionConfigs = (portfolio: PortfolioContent): CvPresetSectionConfig[] => [
  {
    id: "profile",
    source: "profile",
    title: "Profile",
    titleMode: "template",
    type: "text",
    placement: "sidebar",
    visible: true,
    itemIds: [],
  },
  {
    id: "skills",
    source: "skills",
    title: "Skills",
    titleMode: "template",
    type: "tags",
    placement: "sidebar",
    visible: true,
    itemIds: [],
  },
  {
    id: "links",
    source: "links",
    title: "Links",
    titleMode: "template",
    type: "links",
    placement: "sidebar",
    visible: true,
    itemIds: [],
  },
  {
    id: "experience",
    source: "experience",
    title: "Experience",
    titleMode: "template",
    type: "log",
    placement: "main",
    visible: true,
    itemIds: portfolio.experienceLog.map((entry) => entry.id || ""),
  },
  {
    id: "projects",
    source: "projects",
    title: "Projects",
    titleMode: "template",
    type: "log",
    placement: "main",
    visible: true,
    itemIds: allProjects(portfolio)
      .filter(({ project }) => project.showInCv !== false)
      .map(({ project }) => project.id || ""),
  },
  {
    id: "education",
    source: "education",
    title: "Education",
    titleMode: "template",
    type: "log",
    placement: "main",
    visible: true,
    itemIds: portfolio.educationLog.map((entry) => entry.id || ""),
  },
]

export function createInitialHub(
  portfolioInput: PersistedPortfolioContent | PortfolioContent,
  resolvedPresets: CvPreset[] = [],
  now = new Date().toISOString(),
): ContentHubDocument {
  const portfolio = normalizePortfolioForHub(portfolioInput)
  const hub: ContentHubDocument = {
    _id: CONTENT_HUB_ID,
    schemaVersion: CONTENT_HUB_SCHEMA_VERSION,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    portfolio,
    cvProfileExtras: { drivingLicences: [], references: [] },
    sharedSections: [],
    presets: [],
    publishedPresets: [],
    publicationInitialized: true,
  }

  if (resolvedPresets.length === 0) {
    hub.presets = [
      {
        id: stableContentId("preset", ["standard"]),
        name: "Standard",
        layout: "germanic_tabular",
        targetCountry: inferCvCountry(portfolio.contactData.location),
        documentLanguage: "en",
        templateVersion: 1,
        regionalOptions: clone(CV_TEMPLATE_BY_ID.germanic_tabular.defaultOptions),
        visible: true,
        design: defaultCvDesign(CV_TEMPLATE_BY_ID.germanic_tabular.accent),
        contentOverrides: {},
        sections: defaultSectionConfigs(portfolio),
        overrides: {},
      },
      {
        id: stableContentId("preset", ["resume"]),
        name: "Résumé",
        layout: "southern_european",
        targetCountry: inferCvCountry(portfolio.contactData.location),
        documentLanguage: "en",
        templateVersion: 1,
        regionalOptions: clone(CV_TEMPLATE_BY_ID.southern_european.defaultOptions),
        visible: true,
        design: defaultCvDesign(CV_TEMPLATE_BY_ID.southern_european.accent),
        contentOverrides: {},
        sections: defaultSectionConfigs(portfolio),
        overrides: {},
      },
    ]
    hub.publishedPresets = materializeCvPresets(hub)
    return hub
  }

  const reconciled = reconcileResolvedPresets(hub, resolvedPresets)
  reconciled.publishedPresets = materializeCvPresets(reconciled)
  return reconciled
}

const findEntityById = (
  portfolio: PortfolioContent,
  source: CvBindingSource,
  id: string,
): ExperienceEntry | EducationEntry | Project | undefined => {
  if (source === "experience") {
    return portfolio.experienceLog.find((entry) => entry.id === id)
  }
  if (source === "education") {
    return portfolio.educationLog.find((entry) => entry.id === id)
  }
  if (source === "projects") {
    return allProjects(portfolio).find(({ project }) => project.id === id)?.project
  }
  return undefined
}

export function reconcileResolvedPresets(
  inputHub: ContentHubDocument,
  resolvedPresets: CvPreset[],
  activePresetId?: string,
): ContentHubDocument {
  const hub = clone(inputHub)
  const previousConfigs = new Map(hub.presets.map((preset) => [preset.id, preset]))
  const maps = entityMaps(hub.portfolio)
  const nextConfigs: CvPresetConfig[] = []

  for (const resolved of resolvedPresets) {
    const previous = previousConfigs.get(resolved.id)
    const isActive = !activePresetId || resolved.id === activePresetId
    const headerDefaults: CvContentOverrides = {
      name: hub.portfolio.profileData.name,
      title: hub.portfolio.profileData.title,
      location: hub.portfolio.contactData.location,
      email: hub.portfolio.contactData.email,
      phone: hub.portfolio.contactData.phone,
      piva: hub.portfolio.contactData.piva,
      profileExtras: hub.cvProfileExtras,
    }
    const nextContentOverrides: CvContentOverrides = {}
    for (const key of ["name", "title", "location", "email", "phone", "piva", "profileExtras"] as const) {
      if (JSON.stringify(resolved.content[key]) !== JSON.stringify(headerDefaults[key])) {
        const value = resolved.content[key]
        Object.assign(nextContentOverrides, { [key]: value === undefined ? undefined : clone(value) })
      }
    }
    const config: CvPresetConfig = {
      id: resolved.id,
      name: resolved.name,
      layout: resolved.layout,
      targetCountry: resolved.targetCountry,
      documentLanguage: resolved.documentLanguage,
      templateVersion: resolved.templateVersion,
      targetRoleOverride: resolved.targetRoleOverride,
      summaryOverride: resolved.summaryOverride,
      regionalOptions: clone(resolved.regionalOptions),
      visible: resolved.visible,
      design: clone(resolved.design ?? previous?.design ?? defaultCvDesign(CV_TEMPLATE_BY_ID[resolved.layout].accent)),
      contentOverrides: nextContentOverrides,
      sections: [],
      overrides: clone(previous?.overrides ?? {}),
    }

    for (const section of resolved.content.sections) {
      const previousSection = previous?.sections.find((item) => item.id === section.id)
      const source = previousSection?.source ?? sourceForSection(section.id)
      const sectionConfig: CvPresetSectionConfig = {
        id: section.id,
        source,
        sourceId: previousSection?.sourceId,
        title: section.title,
        titleMode: section.titleMode ?? previousSection?.titleMode ?? "custom",
        type: section.type,
        placement: section.placement,
        visible: section.visible,
        itemIds: [],
      }

      if (source === "shared") {
        sectionConfig.localData = clone(section.data)
      } else if (["profile", "skills", "links"].includes(source)) {
        const baseData = previous && previousSection
          ? resolveSectionData(hub, { ...previous, contentOverrides: {}, overrides: {} }, { ...previousSection, localData: undefined, localEntries: undefined })
          : undefined
        if (!baseData || JSON.stringify(section.data) !== JSON.stringify(baseData)) {
          sectionConfig.localData = clone(section.data)
        }
      } else if (
        ["experience", "education", "projects"].includes(source) &&
        section.data.type === "log"
      ) {
        for (const entry of section.data.entries) {
          sectionConfig.entryOrder = [...(sectionConfig.entryOrder ?? []), entry.id]
          let entity = entry.id ? findEntityById(hub.portfolio, source, entry.id) : undefined
          if (!entity) {
            const naturalKey = `${normalizedKey(entry.title)}|${normalizedKey(entry.subtitle)}`
            if (source === "experience") entity = maps.experience.get(naturalKey)
            if (source === "education") entity = maps.education.get(naturalKey)
            if (source === "projects") entity = maps.projects.get(naturalKey)
          }
          if (!entity) {
            sectionConfig.localEntries = [...(sectionConfig.localEntries ?? []), clone(entry)]
            continue
          }
          const entityId = entity.id || ""
          sectionConfig.itemIds.push(entityId)

          if (isActive) {
            entity = findEntityById(hub.portfolio, source, entityId)
            if (!entity) continue
            const base = source === "experience"
              ? experienceLogEntry(entity as ExperienceEntry, { ...config, overrides: {} })
              : source === "education"
                ? educationLogEntry(entity as EducationEntry, { ...config, overrides: {} })
                : projectLogEntry(entity as Project, allProjects(hub.portfolio).find(({ project }) => project.id === entityId)!.category, { ...config, overrides: {} })
            const nextOverride: CvEntityOverride = {}
            for (const key of ["title", "subtitle", "dateStart", "dateEnd", "description", "tags", "url"] as const) {
              if (JSON.stringify(entry[key]) !== JSON.stringify(base[key])) {
                const value = entry[key]
                Object.assign(nextOverride, { [key]: value === undefined ? undefined : clone(value) })
              }
            }
            if (Object.keys(nextOverride).length > 0) {
              config.overrides[entityId] = nextOverride
            } else {
              delete config.overrides[entityId]
            }
          }
        }
      }
      config.sections.push(sectionConfig)
    }
    nextConfigs.push(config)
  }

  hub.presets = nextConfigs
  return normalizeHub(hub)
}

const setEntityShowcaseVisibility = (
  portfolio: PortfolioContent,
  entityType: "experience" | "education" | "project",
  entityId: string,
  visible: boolean,
) => {
  if (entityType === "experience") {
    const entity = portfolio.experienceLog.find((item) => item.id === entityId)
    if (entity) entity.showcaseVisible = visible
  } else if (entityType === "education") {
    const entity = portfolio.educationLog.find((item) => item.id === entityId)
    if (entity) entity.showcaseVisible = visible
  } else {
    const entity = allProjects(portfolio).find(({ project }) => project.id === entityId)?.project
    if (entity) entity.showcaseVisible = visible
  }
}

const applyVisibility = (
  hub: ContentHubDocument,
  target: z.infer<typeof visibilityTargetSchema>,
) => {
  setEntityShowcaseVisibility(
    hub.portfolio,
    target.entityType,
    target.entityId,
    target.showcase,
  )
  const source = target.entityType === "project" ? "projects" : target.entityType
  for (const preset of hub.presets) {
    const section = preset.sections.find((item) => item.source === source)
    if (!section) continue
    const selected = new Set(section.itemIds)
    if (target.presetIds.includes(preset.id)) selected.add(target.entityId)
    else selected.delete(target.entityId)
    section.itemIds = [...selected]
  }
}

const deleteEntity = (
  hub: ContentHubDocument,
  entityType: "experience" | "education" | "project",
  entityId: string,
) => {
  if (entityType === "experience") {
    hub.portfolio.experienceLog = hub.portfolio.experienceLog.filter(
      (item) => item.id !== entityId,
    )
  } else if (entityType === "education") {
    hub.portfolio.educationLog = hub.portfolio.educationLog.filter(
      (item) => item.id !== entityId,
    )
  } else {
    hub.portfolio.projectCategories = hub.portfolio.projectCategories.map((category) => ({
      ...category,
      projects: category.projects.filter((item) => item.id !== entityId),
    }))
  }
  for (const preset of hub.presets) {
    for (const section of preset.sections) {
      section.itemIds = section.itemIds.filter((id) => id !== entityId)
    }
    delete preset.overrides[entityId]
  }
}

export function applyEditorOperations(
  inputHub: ContentHubDocument,
  operations: EditorOperation[],
): ContentHubDocument {
  let hub = clone(inputHub)
  if (!hub.publicationInitialized) {
    hub.publishedPresets = materializeCvPresets(hub)
    hub.publicationInitialized = true
  }
  for (const operation of operations) {
    if (operation.type === "replace-portfolio") {
      hub.portfolio = normalizePortfolioForHub(operation.content)
      for (const target of operation.visibility ?? []) applyVisibility(hub, target)
    } else if (operation.type === "replace-presets") {
      hub = reconcileResolvedPresets(hub, operation.presets, operation.activePresetId)
      const draftIds = new Set(hub.presets.map((preset) => preset.id))
      hub.publishedPresets = hub.publishedPresets.filter((preset) => draftIds.has(preset.id))
    } else if (operation.type === "set-visibility") {
      applyVisibility(hub, operation.target)
    } else if (operation.type === "delete-entity") {
      deleteEntity(hub, operation.entityType, operation.entityId)
    } else if (operation.type === "publish-cv") {
      const config = hub.presets.find((preset) => preset.id === operation.presetId)
      if (!config) throw new Error(`CV ${operation.presetId} does not exist`)
      const snapshot = materializeCvPreset(hub, config)
      const existingIndex = hub.publishedPresets.findIndex((preset) => preset.id === operation.presetId)
      if (existingIndex >= 0) hub.publishedPresets[existingIndex] = snapshot
      else hub.publishedPresets.push(snapshot)
    }
  }
  hub.updatedAt = new Date().toISOString()
  return normalizeHub(hub)
}

export function normalizeHub(input: ContentHubDocument): ContentHubDocument {
  const next = clone(input)
  next.portfolio = normalizePortfolioForHub(next.portfolio)
  const parsed = contentHubDocumentSchema.safeParse(next)
  if (!parsed.success) {
    throw new Error(`Invalid content hub: ${parsed.error.message}`)
  }
  return parsed.data as ContentHubDocument
}

export function validateHubReferences(hub: ContentHubDocument): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const entry of hub.portfolio.experienceLog) if (entry.id) ids.add(entry.id)
  for (const entry of hub.portfolio.educationLog) if (entry.id) ids.add(entry.id)
  for (const { project } of allProjects(hub.portfolio)) if (project.id) ids.add(project.id)
  const sharedIds = new Set(hub.sharedSections.map((section) => section.id))
  for (const preset of hub.presets) {
    for (const section of preset.sections) {
      if (section.source === "shared" && (!section.sourceId || !sharedIds.has(section.sourceId))) {
        errors.push(`Preset ${preset.id} references missing shared section ${section.sourceId}`)
      }
      if (["experience", "education", "projects"].includes(section.source)) {
        for (const id of section.itemIds) {
          if (!ids.has(id)) errors.push(`Preset ${preset.id} references missing entity ${id}`)
        }
      }
    }
    for (const id of Object.keys(preset.overrides)) {
      if (!ids.has(id)) errors.push(`Preset ${preset.id} overrides missing entity ${id}`)
    }
  }
  return errors
}
