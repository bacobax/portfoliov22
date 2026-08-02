import { contentHubDocumentSchema, type ContentHubDocument, type CvPresetSectionConfig } from "@/lib/content-hub"
import {
  CV_TEMPLATE_BY_ID,
  inferCvCountry,
  type CvLayoutId,
} from "@/lib/cv-templates"

type LegacySection = Omit<CvPresetSectionConfig, "titleMode"> & { titleMode?: "template" | "custom" }
type LegacyPreset = {
  id: string
  name: string
  layout: "classic" | "resume"
  visible: boolean
  sections: LegacySection[]
  overrides: Record<string, { description?: string; url?: string }>
}

type LegacyHubV2 = Omit<ContentHubDocument, "schemaVersion" | "cvProfileExtras" | "presets"> & {
  schemaVersion: 2
  presets: LegacyPreset[]
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const legacyLayoutMap: Record<LegacyPreset["layout"], CvLayoutId> = {
  classic: "germanic_tabular",
  resume: "southern_european",
}

const structureSections = (sections: LegacySection[], layout: CvLayoutId): CvPresetSectionConfig[] => {
  const definition = CV_TEMPLATE_BY_ID[layout]
  const rank = new Map(definition.sectionOrder.map((id, index) => [id, index]))
  const originalRank = new Map(sections.map((section, index) => [section.id, index]))
  return clone(sections)
    .map((section) => ({
      ...section,
      titleMode: section.titleMode ?? "custom" as const,
      placement: definition.sidebarSections.includes(section.id) ? "sidebar" as const : "main" as const,
    }))
    .sort((a, b) =>
      (rank.get(a.id) ?? definition.sectionOrder.length + (originalRank.get(a.id) ?? 0)) -
      (rank.get(b.id) ?? definition.sectionOrder.length + (originalRank.get(b.id) ?? 0)),
    )
}

export function migrateContentHubV2ToV3(raw: unknown, now = new Date().toISOString()): ContentHubDocument {
  if (!raw || typeof raw !== "object" || (raw as { schemaVersion?: unknown }).schemaVersion !== 2) {
    throw new Error("Expected a schema version 2 content hub")
  }
  const legacy = clone(raw as LegacyHubV2)
  if (!legacy.portfolio || !Array.isArray(legacy.presets) || !Array.isArray(legacy.sharedSections)) {
    throw new Error("Schema version 2 content hub is incomplete")
  }
  const country = inferCvCountry(legacy.portfolio.contactData.location)
  const next: ContentHubDocument = {
    ...legacy,
    schemaVersion: 3,
    revision: legacy.revision + 1,
    updatedAt: now,
    cvProfileExtras: { drivingLicences: [], references: [] },
    presets: legacy.presets.map((preset) => {
      const layout = legacyLayoutMap[preset.layout]
      if (!layout) throw new Error(`Unsupported legacy layout: ${preset.layout}`)
      return {
        id: preset.id,
        name: preset.name,
        layout,
        targetCountry: country,
        documentLanguage: "en" as const,
        templateVersion: 1,
        regionalOptions: clone(CV_TEMPLATE_BY_ID[layout].defaultOptions),
        visible: preset.visible,
        sections: structureSections(preset.sections, layout),
        overrides: clone(preset.overrides),
      }
    }),
  }
  const parsed = contentHubDocumentSchema.safeParse(next)
  if (!parsed.success) throw new Error(`Migrated v3 hub is invalid: ${parsed.error.message}`)
  return parsed.data as ContentHubDocument
}
