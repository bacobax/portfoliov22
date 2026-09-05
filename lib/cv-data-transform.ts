import type { CvContent, CvSection, CvSectionData } from "@/lib/cv-content"
import type { CvData, CvDisplaySection, CvDisplayContent, CvDescriptionBlock } from "@/components/cv/cv-types"
import type { CvPreset } from "@/lib/cv-presets"
import { labelsForLocale, type CvLocale } from "@/lib/cv-templates"

// Plain text stays prose; only explicit list markers create bullet items.
export function parseCvDescription(value: string): CvDescriptionBlock[] {
  const blocks: CvDescriptionBlock[] = []
  let previous: (typeof blocks)[number] | undefined
  for (const line of value.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) { previous = undefined; continue }
    const bullet = text.match(/^[-*•]\s+(.+)$/)
    if (bullet) {
      if (previous?.type === "bullets") previous.items.push(bullet[1])
      else { previous = { type: "bullets", items: [bullet[1]] }; blocks.push(previous) }
    } else {
      if (previous?.type === "paragraph") previous.text += `\n${text}`
      else { previous = { type: "paragraph", text }; blocks.push(previous) }
    }
  }
  return blocks
}

export const descriptionBulletCount = (value: string): number => parseCvDescription(value)
  .reduce((count, block) => count + (block.type === "bullets" ? block.items.length : 0), 0)

export const formatLabel = (value: string): string => {
  return value.replace(/\s+/g, " ").trim()
}

/** Transform raw section data → display-ready content */
const localizeDate = (value: string, locale: CvLocale): string => {
  const normalized = value.trim().toLowerCase()
  if (["present", "current", "ongoing", "today", "now"].includes(normalized)) {
    return labelsForLocale(locale).present
  }
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return value
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${match[1]}-${match[2]}-01T00:00:00Z`))
}

function transformSectionData(data: CvSectionData, locale: CvLocale, hideStatus = false): CvDisplayContent {
  switch (data.type) {
    case "log":
      return {
        type: "log",
        entries: data.entries.map((e) => ({
          title: formatLabel(e.title),
          subtitle: formatLabel(e.subtitle),
          dates: [e.dateStart, e.dateEnd].filter((date) => date && !(hideStatus && /^(production|beta|development|ongoing|terminated|completed)$/i.test(date.trim()))).map((date) => localizeDate(date, locale)).join("–"),
          description: parseCvDescription(e.description),
          tags: e.tags.map(formatLabel),
          url: e.url || undefined,
        })),
      }
    case "tags":
      return {
        type: "tags",
        groups: data.groups.map((g) => ({
          category: formatLabel(g.category),
          items: g.items.map(formatLabel),
        })),
      }
    case "text":
      return { type: "text", text: formatLabel(data.content) }
    case "links":
      return { type: "links", items: data.items }
    case "simple-list":
      return { type: "simple-list", items: data.items.map(formatLabel) }
  }
}

function transformSection(section: CvSection, locale: CvLocale, hideStatus: boolean): CvDisplaySection {
  return {
    id: section.id,
    title: section.title,
    type: section.type,
    placement: section.placement,
    visible: section.visible,
    content: transformSectionData(section.data, locale, section.id === "projects" && hideStatus),
  }
}

/** Build CvData purely from CV content — no server dependencies */
export function createCvData(cv: CvContent, preset?: Pick<CvPreset,
  "targetCountry" | "documentLanguage" | "regionalOptions" | "targetRoleOverride" | "summaryOverride" | "design"
>): CvData {
  const locale = preset?.documentLanguage ?? "en"
  return {
    name: formatLabel(cv.name || ""),
    title: formatLabel(cv.title || ""),
    location: cv.location || "",
    piva: cv.piva || "",
    email: cv.email || "",
    phone: cv.phone || "",
    profileExtras: cv.profileExtras,
    targetCountry: preset?.targetCountry,
    documentLanguage: locale,
    regionalOptions: preset?.regionalOptions,
    targetRoleOverride: preset?.targetRoleOverride,
    summaryOverride: preset?.summaryOverride,
    design: preset?.design,
    sections: cv.sections
      .filter((s) => s.visible)
      .map((section) => transformSection(section, locale, !preset?.design?.showProjectStatus)),
  }
}
