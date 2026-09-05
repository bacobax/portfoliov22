import { defaultCvDesign } from "@/lib/cv-document"
import { CV_TEMPLATE_BY_ID, isCvLayoutId } from "@/lib/cv-templates"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

/** Repair only optional fields emitted as BSON null by the initial snapshot migration.
 * Required fields and unrelated null values remain subject to schema validation.
 */
function hydratePublishedPreset(value: unknown): unknown {
  if (!isRecord(value)) return value
  const preset = { ...value }
  for (const key of ["targetRoleOverride", "summaryOverride"]) {
    if (preset[key] === null) delete preset[key]
  }
  if (isRecord(preset.content) && Array.isArray(preset.content.sections)) {
    preset.content = {
      ...preset.content,
      sections: preset.content.sections.map((section: unknown) => {
        if (!isRecord(section) || !isRecord(section.data) || section.data.type !== "log" || !Array.isArray(section.data.entries)) return section
        return {
          ...section,
          data: {
            ...section.data,
            entries: section.data.entries.map((entry: unknown) => {
              if (!isRecord(entry) || entry.url !== null) return entry
              const clean = { ...entry }
              delete clean.url
              return clean
            }),
          },
        }
      }),
    }
  }
  return preset
}

export function hydrateStoredContentHub(document: Record<string, unknown>) {
  return {
    ...document,
    presets: Array.isArray(document.presets) ? document.presets.map((preset: unknown) => {
      if (!isRecord(preset)) return preset
      const layout = typeof preset.layout === "string" && isCvLayoutId(preset.layout) ? preset.layout : "southern_european"
      return { ...preset, design: preset.design ?? defaultCvDesign(CV_TEMPLATE_BY_ID[layout].accent), contentOverrides: preset.contentOverrides ?? {} }
    }) : document.presets,
    publishedPresets: Array.isArray(document.publishedPresets)
      ? document.publishedPresets.map(hydratePublishedPreset)
      : document.publishedPresets,
  }
}
