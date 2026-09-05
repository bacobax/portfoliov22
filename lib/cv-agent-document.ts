import { z } from "zod"
import { cvPresetSchema } from "@/lib/cv-presets"
import { CV_DOCUMENT_SCHEMA_VERSION } from "@/lib/cv-document"

export const cvAgentDocumentSchema = z.object({
  schemaVersion: z.literal(CV_DOCUMENT_SCHEMA_VERSION),
  baseRevision: z.number().int().nonnegative(),
  cv: cvPresetSchema,
}).superRefine((document, ctx) => {
  const safeUrl = (value: string) => /^https?:\/\//i.test(value) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
  const sectionIds = new Set<string>()
  for (const [sectionIndex, section] of document.cv.content.sections.entries()) {
    if (!section.id.trim() || sectionIds.has(section.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cv", "content", "sections", sectionIndex, "id"], message: "Section IDs must be non-empty and unique" })
    sectionIds.add(section.id)
    if (section.data.type === "log") {
      const ids = new Set<string>()
      for (const [entryIndex, entry] of section.data.entries.entries()) {
        if (!entry.id.trim() || ids.has(entry.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cv", "content", "sections", sectionIndex, "data", "entries", entryIndex, "id"], message: "Entry IDs must be non-empty and unique within a section" })
        ids.add(entry.id)
        if (entry.url && !safeUrl(entry.url)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cv", "content", "sections", sectionIndex, "data", "entries", entryIndex, "url"], message: "URLs must use http or https" })
      }
    }
    if (section.data.type === "links") section.data.items.forEach((item, itemIndex) => {
      if (!safeUrl(item.url)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cv", "content", "sections", sectionIndex, "data", "items", itemIndex, "url"], message: "URLs must use http or https" })
    })
  }
  for (const [index, id] of document.cv.design.pageBreakBefore.entries()) {
    if (!sectionIds.has(id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cv", "design", "pageBreakBefore", index], message: "Page breaks must reference an existing section ID" })
  }
  const imageUrl = document.cv.content.profileExtras?.profileImage?.url
  if (imageUrl && !safeUrl(imageUrl)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cv", "content", "profileExtras", "profileImage", "url"], message: "Image URLs must use http or https" })
})

export type CvAgentDocument = z.infer<typeof cvAgentDocumentSchema>
