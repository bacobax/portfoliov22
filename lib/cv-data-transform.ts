import type { CvContent, CvSection, CvSectionData } from "@/lib/cv-content"
import type { CvData, CvDisplaySection, CvDisplayContent } from "@/components/cv/cv-types"
import type { CvPreset } from "@/lib/cv-presets"
import { labelsForLocale, type CvLocale } from "@/lib/cv-templates"

export const splitSentences = (value: string): string[] =>
  value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

export const formatLabel = (value: string): string => {
  const normalized = value.replace(/_/g, " ").replace(/\s+/g, " ").trim()

  if (!normalized) {
    return normalized
  }

  const hasLowercase = /[a-z]/.test(normalized)
  const hasUppercase = /[A-Z]/.test(normalized)

  if (hasUppercase && !hasLowercase) {
    const lowerCased = normalized.toLowerCase()
    return lowerCased.replace(/(^|[\s/])([a-z])/g, (_, boundary: string, letter: string) =>
      `${boundary}${letter.toUpperCase()}`,
    )
  }

  return normalized
}

/** Transform raw section data → display-ready content */
const localizeDate = (value: string, locale: CvLocale): string => {
  const normalized = value.trim().toLowerCase()
  if (["present", "current", "ongoing", "today", "now"].includes(normalized)) {
    return labelsForLocale(locale).present
  }
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return value
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${match[1]}-${match[2]}-01T00:00:00Z`))
}

function transformSectionData(data: CvSectionData, locale: CvLocale): CvDisplayContent {
  switch (data.type) {
    case "log":
      return {
        type: "log",
        entries: data.entries.map((e) => ({
          title: formatLabel(e.title),
          subtitle: formatLabel(e.subtitle),
          dates: [e.dateStart, e.dateEnd].filter(Boolean).map((date) => localizeDate(date, locale)).join(" — "),
          bullets: splitSentences(e.description),
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

function transformSection(section: CvSection, locale: CvLocale): CvDisplaySection {
  return {
    id: section.id,
    title: section.title,
    type: section.type,
    placement: section.placement,
    visible: section.visible,
    content: transformSectionData(section.data, locale),
  }
}

/** Build CvData purely from CV content — no server dependencies */
export function createCvData(cv: CvContent, preset?: Pick<CvPreset,
  "targetCountry" | "documentLanguage" | "regionalOptions" | "targetRoleOverride" | "summaryOverride"
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
    sections: cv.sections
      .filter((s) => s.visible)
      .map((section) => transformSection(section, locale)),
  }
}
