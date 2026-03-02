import { z } from "zod"
import { cvContentSchema, type CvContent, emptyCvContent } from "@/lib/cv-content"

/* ── Layout IDs ── */
export type CvLayoutId = "classic" | "resume"

/* ── Single preset ── */
export interface CvPreset {
  id: string
  name: string
  layout: CvLayoutId
  visible: boolean
  content: CvContent
}

/* ── All presets document ── */
export interface CvPresetsDocument {
  presets: CvPreset[]
}

/* ── Zod schemas ── */
export const cvPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  layout: z.enum(["classic", "resume"]),
  visible: z.boolean(),
  content: cvContentSchema,
})

export const cvPresetsDocumentSchema = z.object({
  presets: z.array(cvPresetSchema),
})

export type PersistedCvPresetsDocument = z.infer<typeof cvPresetsDocumentSchema>

/* ── Helpers ── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export function createEmptyPreset(name: string, layout: CvLayoutId): CvPreset {
  return {
    id: uid(),
    name,
    layout,
    visible: true,
    content: emptyCvContent(),
  }
}

export function defaultPresetsDocument(): CvPresetsDocument {
  return { presets: [] }
}
