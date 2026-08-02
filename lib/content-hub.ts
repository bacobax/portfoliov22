import { z } from "zod"

import {
  cvContentSchema,
  cvSectionDataSchema,
  type CvContent,
  type CvLogEntry,
  type CvSectionData,
} from "@/lib/cv-content"
import {
  cvPresetSchema,
  type CvLayoutId,
  type CvPreset,
} from "@/lib/cv-presets"
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
export const CONTENT_HUB_SCHEMA_VERSION = 2 as const

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
  type: CvSectionData["type"]
  placement: "sidebar" | "main"
  visible: boolean
  itemIds: string[]
}

export interface CvEntityOverride {
  description?: string
  url?: string
}

export interface CvPresetConfig {
  id: string
  name: string
  layout: CvLayoutId
  visible: boolean
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
  sharedSections: SharedCvSection[]
  presets: CvPresetConfig[]
}

const sharedCvSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
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
  type: z.enum(["log", "tags", "text", "links", "simple-list"]),
  placement: z.enum(["sidebar", "main"]),
  visible: z.boolean(),
  itemIds: z.array(z.string()),
})

const cvPresetConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  layout: z.enum(["classic", "resume"]),
  visible: z.boolean(),
  sections: z.array(cvPresetSectionConfigSchema),
  overrides: z.record(
    z.object({
      description: z.string().optional(),
      url: z.string().optional(),
    }),
  ),
})

export const contentHubDocumentSchema = z.object({
  _id: z.literal(CONTENT_HUB_ID),
  schemaVersion: z.literal(CONTENT_HUB_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  portfolio: portfolioContentSchema,
  sharedSections: z.array(sharedCvSectionSchema),
  presets: z.array(cvPresetConfigSchema),
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

const joinYear = (start: string, end: string): string =>
  [start, end].filter(Boolean).join(" - ")

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
    title: entry.title,
    subtitle: entry.company,
    ...dates,
    description:
      override.description ?? entry.cvDescription?.trim() ?? entry.description,
    tags: [...entry.tags],
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
    title: entry.degree,
    subtitle: entry.institution,
    ...dates,
    description:
      override.description ?? entry.cvDescription?.trim() ?? entry.description,
    tags: [...entry.tags],
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
    title: project.title,
    subtitle: category.name,
    dateStart: project.status,
    dateEnd: "",
    description:
      override.description ?? project.cvDescription?.trim() ?? project.description,
    tags: Object.entries(project.metrics).map(([key, value]) => `${key}: ${value}`),
    url: override.url ?? project.projectUrl ?? project.githubUrl,
  }
}

const resolveSectionData = (
  hub: ContentHubDocument,
  preset: CvPresetConfig,
  section: CvPresetSectionConfig,
): CvSectionData => {
  const selected = new Set(section.itemIds)
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
        entries: hub.portfolio.experienceLog
          .filter((entry) => selected.has(entry.id || ""))
          .map((entry) => experienceLogEntry(entry, preset)),
      }
    case "education":
      return {
        type: "log",
        entries: hub.portfolio.educationLog
          .filter((entry) => selected.has(entry.id || ""))
          .map((entry) => educationLogEntry(entry, preset)),
      }
    case "projects":
      return {
        type: "log",
        entries: allProjects(hub.portfolio)
          .filter(({ project }) => selected.has(project.id || ""))
          .map(({ project, category }) => projectLogEntry(project, category, preset)),
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
  const content: CvContent = {
    name: hub.portfolio.profileData.name,
    title: hub.portfolio.profileData.title,
    location: contact.location,
    email: contact.email,
    phone: contact.phone,
    piva: contact.piva,
    sections: preset.sections.map((section) => ({
      id: section.id,
      title: section.title,
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
    visible: preset.visible,
    content: cvContentSchema.parse(content),
  }
}

export function materializeCvPresets(hub: ContentHubDocument): CvPreset[] {
  return hub.presets.map((preset) => materializeCvPreset(hub, preset))
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
    type: "text",
    placement: "sidebar",
    visible: true,
    itemIds: [],
  },
  {
    id: "skills",
    source: "skills",
    title: "Skills",
    type: "tags",
    placement: "sidebar",
    visible: true,
    itemIds: [],
  },
  {
    id: "links",
    source: "links",
    title: "Links",
    type: "links",
    placement: "sidebar",
    visible: true,
    itemIds: [],
  },
  {
    id: "experience",
    source: "experience",
    title: "Experience",
    type: "log",
    placement: "main",
    visible: true,
    itemIds: portfolio.experienceLog.map((entry) => entry.id || ""),
  },
  {
    id: "projects",
    source: "projects",
    title: "Projects",
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
    sharedSections: [],
    presets: [],
  }

  if (resolvedPresets.length === 0) {
    hub.presets = [
      {
        id: stableContentId("preset", ["standard"]),
        name: "Standard",
        layout: "classic",
        visible: true,
        sections: defaultSectionConfigs(portfolio),
        overrides: {},
      },
      {
        id: stableContentId("preset", ["resume"]),
        name: "Résumé",
        layout: "resume",
        visible: true,
        sections: defaultSectionConfigs(portfolio),
        overrides: {},
      },
    ]
    return hub
  }

  return reconcileResolvedPresets(hub, resolvedPresets)
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

const canonicalDescription = (
  entity: ExperienceEntry | EducationEntry | Project,
): string => entity.cvDescription?.trim() || entity.description

const updateKnownSkills = (skills: SkillsData, data: CvSectionData): SkillsData => {
  if (data.type !== "tags") return skills
  const next = clone(skills)
  for (const group of data.groups) {
    const key = normalizedKey(group.category).replaceAll(" ", "")
    if (key === "frontend") next.frontend = [...group.items]
    if (key === "backend") next.backend = [...group.items]
    if (key === "devops" || key === "infrastructure") next.devops = [...group.items]
    if (key === "aitools") next.aiTools = [...group.items]
    if (key === "aisystems") next.aiSystems = [...group.items]
  }
  return next
}

const ensureSharedSection = (
  hub: ContentHubDocument,
  section: CvPreset["content"]["sections"][number],
  preferredSourceId?: string,
): string => {
  const serialized = JSON.stringify(section.data)
  const existing = preferredSourceId
    ? hub.sharedSections.find((item) => item.id === preferredSourceId)
    : hub.sharedSections.find(
        (item) => item.title === section.title && JSON.stringify(item.data) === serialized,
      )
  if (existing) {
    existing.title = section.title
    existing.type = section.type
    existing.data = clone(section.data)
    return existing.id
  }
  const id = stableContentId("cv-section", [section.id, section.title, serialized])
  hub.sharedSections.push({
    id,
    title: section.title,
    type: section.type,
    data: clone(section.data),
  })
  return id
}

const addUnknownLogEntity = (
  hub: ContentHubDocument,
  source: CvBindingSource,
  entry: CvLogEntry,
): string => {
  const id = entry.id || stableContentId(source, [entry.title, entry.subtitle, entry.dateStart])
  if (source === "experience") {
    hub.portfolio.experienceLog.push({
      id,
      showcaseVisible: entry.showcaseVisible === true,
      year: joinYear(entry.dateStart, entry.dateEnd),
      title: entry.title,
      company: entry.subtitle,
      description: entry.description,
      tags: [...entry.tags],
    })
  } else if (source === "education") {
    hub.portfolio.educationLog.push({
      id,
      showcaseVisible: entry.showcaseVisible === true,
      year: joinYear(entry.dateStart, entry.dateEnd),
      degree: entry.title,
      institution: entry.subtitle,
      description: entry.description,
      tags: [...entry.tags],
    })
  } else if (source === "projects") {
    let category = hub.portfolio.projectCategories.find(
      (item) => normalizedKey(item.name) === normalizedKey(entry.subtitle),
    )
    if (!category) {
      category = {
        id: stableContentId("category", [entry.subtitle || "CV imports"]),
        name: entry.subtitle || "CV imports",
        visual: "sphere",
        projects: [],
      }
      hub.portfolio.projectCategories.push(category)
    }
    category.projects.push({
      id,
      showcaseVisible: entry.showcaseVisible === true,
      title: entry.title,
      description: entry.description,
      status: ["PRODUCTION", "BETA", "DEVELOPMENT", "ONGOING", "TERMINED"].includes(
        entry.dateStart,
      )
        ? (entry.dateStart as Project["status"])
        : "ONGOING",
      metrics: {},
      projectUrl: entry.url,
      showInCv: true,
    })
  }
  return id
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
    const updatesCanonical = Boolean(activePresetId && resolved.id === activePresetId)
    const config: CvPresetConfig = {
      id: resolved.id,
      name: resolved.name,
      layout: resolved.layout,
      visible: resolved.visible,
      sections: [],
      overrides: clone(previous?.overrides ?? {}),
    }

    if (updatesCanonical) {
      hub.portfolio.profileData.name = resolved.content.name ?? hub.portfolio.profileData.name
      hub.portfolio.profileData.title = resolved.content.title ?? hub.portfolio.profileData.title
      hub.portfolio.contactData.location = resolved.content.location ?? ""
      hub.portfolio.contactData.email = resolved.content.email ?? ""
      hub.portfolio.contactData.phone = resolved.content.phone ?? ""
      hub.portfolio.contactData.piva = resolved.content.piva ?? ""
    }

    for (const section of resolved.content.sections) {
      const previousSection = previous?.sections.find((item) => item.id === section.id)
      const source = previousSection?.source ?? sourceForSection(section.id)
      const sectionConfig: CvPresetSectionConfig = {
        id: section.id,
        source,
        sourceId: previousSection?.sourceId,
        title: section.title,
        type: section.type,
        placement: section.placement,
        visible: section.visible,
        itemIds: [],
      }

      if (source === "shared") {
        if (isActive || !previousSection?.sourceId) {
          sectionConfig.sourceId = ensureSharedSection(
            hub,
            section,
            previousSection?.sourceId,
          )
        }
      } else if (source === "profile" && updatesCanonical && section.data.type === "text") {
        hub.portfolio.profileData.bio = section.data.content
      } else if (source === "skills" && updatesCanonical) {
        hub.portfolio.skillsData = updateKnownSkills(
          hub.portfolio.skillsData,
          section.data,
        )
      } else if (source === "links" && updatesCanonical && section.data.type === "links") {
        hub.portfolio.contactData.links = section.data.items.map((item, index) => ({
          id:
            hub.portfolio.contactData.links[index]?.id ||
            stableContentId("link", [item.label, item.url], index),
          label: item.label,
          url: item.url,
        }))
      } else if (
        ["experience", "education", "projects"].includes(source) &&
        section.data.type === "log"
      ) {
        for (const entry of section.data.entries) {
          let entity = entry.id ? findEntityById(hub.portfolio, source, entry.id) : undefined
          if (!entity) {
            const naturalKey = `${normalizedKey(entry.title)}|${normalizedKey(entry.subtitle)}`
            if (source === "experience") entity = maps.experience.get(naturalKey)
            if (source === "education") entity = maps.education.get(naturalKey)
            if (source === "projects") entity = maps.projects.get(naturalKey)
          }
          const entityId = entity?.id || addUnknownLogEntity(hub, source, entry)
          sectionConfig.itemIds.push(entityId)

          if (isActive) {
            entity = findEntityById(hub.portfolio, source, entityId)
            if (!entity) continue
            if (updatesCanonical && source === "experience") {
              const experience = entity as ExperienceEntry
              experience.title = entry.title
              experience.company = entry.subtitle
              experience.year = joinYear(entry.dateStart, entry.dateEnd)
              experience.tags = [...entry.tags]
            } else if (updatesCanonical && source === "education") {
              const education = entity as EducationEntry
              education.degree = entry.title
              education.institution = entry.subtitle
              education.year = joinYear(entry.dateStart, entry.dateEnd)
              education.tags = [...entry.tags]
            } else if (updatesCanonical) {
              const project = entity as Project
              project.title = entry.title
              if (
                ["PRODUCTION", "BETA", "DEVELOPMENT", "ONGOING", "TERMINED"].includes(
                  entry.dateStart,
                )
              ) {
                project.status = entry.dateStart as Project["status"]
              }
            }
            const fallback = canonicalDescription(entity)
            const nextOverride: CvEntityOverride = {}
            if (entry.description !== fallback) nextOverride.description = entry.description
            const canonicalUrl =
              source === "projects"
                ? (entity as Project).projectUrl ?? (entity as Project).githubUrl
                : undefined
            if (entry.url && entry.url !== canonicalUrl) nextOverride.url = entry.url
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
  for (const operation of operations) {
    if (operation.type === "replace-portfolio") {
      hub.portfolio = normalizePortfolioForHub(operation.content)
      for (const target of operation.visibility ?? []) applyVisibility(hub, target)
    } else if (operation.type === "replace-presets") {
      hub = reconcileResolvedPresets(hub, operation.presets, operation.activePresetId)
    } else if (operation.type === "set-visibility") {
      applyVisibility(hub, operation.target)
    } else if (operation.type === "delete-entity") {
      deleteEntity(hub, operation.entityType, operation.entityId)
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
