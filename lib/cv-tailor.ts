import { z } from "zod"

import type { CvData, CvDisplaySection } from "@/components/cv/cv-types"
import { createCvData } from "@/lib/cv-data-transform"
import { cvDesignSchema } from "@/lib/cv-document"
import { cvProfileExtrasSchema } from "@/lib/cv-content"
import { cvRegionalOptionsSchema, type CvPreset } from "@/lib/cv-presets"
import { CV_COUNTRIES, CV_LOCALES, CV_TEMPLATE_IDS, type CvLayoutId } from "@/lib/cv-templates"

/**
 * A private, single-slot CV draft used to tailor a CV for one application.
 * It stores display-level data (what the layout renders) so inline edits map
 * one-to-one onto the page, and never touches the canonical content hub.
 */
export interface TailoredCv {
  sourcePresetId: string
  sourcePresetName: string
  layout: CvLayoutId
  /** Free-form target, e.g. "Acme – Senior GenAI Engineer". Used in the PDF name. */
  label: string
  data: CvData
  updatedAt?: string
}

const text = z.string().max(20_000)

const descriptionBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text, title: text.optional() }),
  z.object({ type: z.literal("bullets"), items: z.array(text) }),
])

const displayContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("log"),
    entries: z.array(z.object({
      title: text,
      subtitle: text,
      dates: text,
      description: z.array(descriptionBlockSchema),
      tags: z.array(text),
      url: text.optional(),
      hidden: z.boolean().optional(),
    })),
  }),
  z.object({ type: z.literal("tags"), groups: z.array(z.object({ category: text, items: z.array(text) })) }),
  z.object({ type: z.literal("text"), text }),
  z.object({ type: z.literal("links"), items: z.array(z.object({ label: text, url: text })) }),
  z.object({ type: z.literal("simple-list"), items: z.array(text) }),
])

const displaySectionSchema = z.object({
  id: z.string().min(1).max(200),
  title: text,
  type: z.enum(["log", "tags", "text", "links", "simple-list"]),
  placement: z.enum(["sidebar", "main"]),
  visible: z.boolean(),
  content: displayContentSchema,
}).refine((section) => section.type === section.content.type, { message: "Section type must match its content" })

const cvDataSchema = z.object({
  name: text,
  title: text,
  location: text,
  piva: text,
  email: text,
  phone: text,
  profileExtras: cvProfileExtrasSchema.optional(),
  contactLinks: z.array(z.object({ label: text, url: text })).optional(),
  targetCountry: z.enum(CV_COUNTRIES).optional(),
  documentLanguage: z.enum(CV_LOCALES).optional(),
  regionalOptions: cvRegionalOptionsSchema.optional(),
  targetRoleOverride: text.optional(),
  summaryOverride: text.optional(),
  design: cvDesignSchema.optional(),
  sections: z.array(displaySectionSchema).max(60),
})

export const tailoredCvSchema = z.object({
  sourcePresetId: z.string().max(200),
  sourcePresetName: z.string().max(200),
  layout: z.enum(CV_TEMPLATE_IDS),
  label: z.string().max(200),
  data: cvDataSchema,
})

export function parseTailoredCv(candidate: unknown): TailoredCv | null {
  const parsed = tailoredCvSchema.safeParse(candidate)
  return parsed.success ? (parsed.data as TailoredCv) : null
}

/** Start a tailored draft from a preset, baking overrides into editable fields. */
export function createTailoredCv(preset: CvPreset, fallbackLinks: readonly { url: string }[] = []): TailoredCv {
  const data = createCvData(preset.content, preset, fallbackLinks)
  const summary = data.summaryOverride?.trim()
  return {
    sourcePresetId: preset.id,
    sourcePresetName: preset.name,
    layout: preset.layout,
    label: "",
    data: {
      ...data,
      title: data.targetRoleOverride?.trim() || data.title,
      targetRoleOverride: undefined,
      summaryOverride: undefined,
      sections: data.sections.map((section): CvDisplaySection =>
        section.id === "profile" && summary && section.content.type === "text"
          ? { ...section, content: { type: "text", text: summary } }
          : section,
      ),
    },
  }
}

/** The data that should reach the downloaded PDF: hidden sections and entries removed. */
export function visibleTailoredData(data: CvData): CvData {
  return {
    ...data,
    sections: data.sections
      .filter((section) => section.visible)
      .map((section) => section.content.type === "log"
        ? { ...section, content: { ...section.content, entries: section.content.entries.filter((entry) => !entry.hidden) } }
        : section),
  }
}

export type CvPath = readonly (string | number)[]

/** Immutable set at a path of object keys / array indices. */
export function setAtPath<T>(root: T, path: CvPath, value: unknown): T {
  if (path.length === 0) return value as T
  const [head, ...rest] = path
  const container = root as unknown
  if (Array.isArray(container)) {
    const next = [...container]
    next[head as number] = setAtPath(next[head as number], rest, value)
    return next as T
  }
  const record = (container ?? {}) as Record<string, unknown>
  return { ...record, [head]: setAtPath(record[head as string], rest, value) } as T
}

export function getAtPath(root: unknown, path: CvPath): unknown {
  return path.reduce<unknown>((current, key) => (current as Record<string | number, unknown> | undefined)?.[key], root)
}

/** Swap items `a` and `b` of the array at `listPath`. */
export function swapAtPath<T>(root: T, listPath: CvPath, a: number, b: number): T {
  const list = getAtPath(root, listPath)
  if (!Array.isArray(list) || a === b || a < 0 || b < 0 || a >= list.length || b >= list.length) return root
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return setAtPath(root, listPath, next)
}

/** Move item `from` of the array at `listPath` so it ends up at index `to`. */
export function moveAtPath<T>(root: T, listPath: CvPath, from: number, to: number): T {
  const list = getAtPath(root, listPath)
  if (!Array.isArray(list) || from === to || [from, to].some((i) => i < 0 || i >= list.length)) return root
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return setAtPath(root, listPath, next)
}

export function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

export function tailoredPdfTitle(draft: Pick<TailoredCv, "label" | "data">): string {
  const name = draft.data.name.trim()
  const label = draft.label.trim()
  return [name || "Curriculum Vitae", "CV", label].filter(Boolean).join(" - ")
}
