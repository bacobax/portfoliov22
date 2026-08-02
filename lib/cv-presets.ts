import { z } from "zod"

import { cvContentSchema, type CvContent, emptyCvContent } from "@/lib/cv-content"
import {
  COUNTRY_LOCALES,
  CV_COUNTRIES,
  CV_LOCALES,
  CV_TEMPLATE_BY_ID,
  CV_TEMPLATE_IDS,
  labelsForLocale,
  templateForCountry,
  type CvCountry,
  type CvLayoutId,
  type CvLocale,
  type CvRegionalOptions,
  type TemplateSectionKey,
} from "@/lib/cv-templates"

export type { CvCountry, CvLayoutId, CvLocale, CvRegionalOptions }

export interface CvPreset {
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
  content: CvContent
}

export interface CvPresetsDocument {
  presets: CvPreset[]
}

export const cvRegionalOptionsSchema = z.object({
  showPhoto: z.boolean(),
  personalFields: z.array(z.enum([
    "dateOfBirth", "placeOfBirth", "nationality", "workAuthorization",
    "drivingLicences", "references",
  ])),
  showSignature: z.boolean(),
  documentDate: z.string(),
  customFooter: z.string(),
})

export const cvPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  layout: z.enum(CV_TEMPLATE_IDS),
  targetCountry: z.enum(CV_COUNTRIES),
  documentLanguage: z.enum(CV_LOCALES),
  templateVersion: z.number().int().positive(),
  targetRoleOverride: z.string().optional(),
  summaryOverride: z.string().optional(),
  regionalOptions: cvRegionalOptionsSchema,
  visible: z.boolean(),
  content: cvContentSchema,
}).superRefine((preset, ctx) => {
  if (!COUNTRY_LOCALES[preset.targetCountry].includes(preset.documentLanguage)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentLanguage"],
      message: `${preset.documentLanguage} is not offered for ${preset.targetCountry}`,
    })
  }
})

export const cvPresetsDocumentSchema = z.object({ presets: z.array(cvPresetSchema) })
export type PersistedCvPresetsDocument = z.infer<typeof cvPresetsDocumentSchema>

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const knownSection = (id: string): id is TemplateSectionKey =>
  ["profile", "skills", "languages", "certs", "links", "experience", "projects", "education", "awards", "publications"].includes(id)

export function applyTemplateStructure(
  content: CvContent,
  layout: CvLayoutId,
  locale: CvLocale,
  options: { templateTitles?: boolean } = {},
): CvContent {
  const definition = CV_TEMPLATE_BY_ID[layout]
  const labels = labelsForLocale(locale)
  const ranked = new Map(definition.sectionOrder.map((id, index) => [id, index]))
  const sections = clone(content.sections).map((section) => {
    const templateTitle = knownSection(section.id) ? labels[section.id] : section.title
    const shouldUseTemplateTitle = knownSection(section.id) &&
      (options.templateTitles || section.titleMode === "template")
    return {
      ...section,
      title: shouldUseTemplateTitle ? templateTitle : section.title,
      titleMode: shouldUseTemplateTitle ? "template" as const : (section.titleMode ?? "custom" as const),
      placement: definition.sidebarSections.includes(section.id) ? "sidebar" as const : "main" as const,
    }
  })
  sections.sort((a, b) => {
    const aRank = ranked.get(a.id) ?? definition.sectionOrder.length + content.sections.findIndex((item) => item.id === a.id)
    const bRank = ranked.get(b.id) ?? definition.sectionOrder.length + content.sections.findIndex((item) => item.id === b.id)
    return aRank - bRank
  })
  return { ...clone(content), sections }
}

export function changePresetLanguage(preset: CvPreset, locale: CvLocale): CvPreset {
  return {
    ...preset,
    documentLanguage: locale,
    content: applyTemplateStructure(preset.content, preset.layout, locale),
  }
}

export function changePresetTemplate(preset: CvPreset, layout: CvLayoutId): CvPreset {
  return {
    ...preset,
    layout,
    templateVersion: 1,
    regionalOptions: clone(preset.regionalOptions),
    content: applyTemplateStructure(preset.content, layout, preset.documentLanguage),
  }
}

export function createRegionalPreset(input: {
  name: string
  country: CvCountry
  locale: CvLocale
  layout?: CvLayoutId
  sourceContent?: CvContent
}): CvPreset {
  const layout = input.layout ?? templateForCountry(input.country)
  const source = input.sourceContent ? clone(input.sourceContent) : emptyCvContent()
  return {
    id: uid(),
    name: input.name,
    layout,
    targetCountry: input.country,
    documentLanguage: input.locale,
    templateVersion: 1,
    regionalOptions: clone(CV_TEMPLATE_BY_ID[layout].defaultOptions),
    visible: true,
    content: applyTemplateStructure(source, layout, input.locale, { templateTitles: true }),
  }
}

/** Kept for call sites that only need a deterministic empty regional preset. */
export function createEmptyPreset(name: string, layout: CvLayoutId): CvPreset {
  const country = CV_TEMPLATE_BY_ID[layout].countries[0]
  return createRegionalPreset({ name, country, locale: COUNTRY_LOCALES[country][0], layout })
}

export function defaultPresetsDocument(): CvPresetsDocument {
  return { presets: [] }
}
