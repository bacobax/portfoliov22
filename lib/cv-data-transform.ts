import type { CvContent, CvSection, CvSectionData } from "@/lib/cv-content"
import type { CvData, CvDisplaySection, CvDisplayContent } from "@/components/cv/cv-types"

const CONTACT_EMAIL = "quicksolver02@gmail.com"
const CONTACT_PHONE = ""
const ADDRESS = "Via Entracque, 10, Cuneo (12100)"
const PIVA = "P.IVA: 04081230049 - QuickSolver"

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
function transformSectionData(data: CvSectionData): CvDisplayContent {
  switch (data.type) {
    case "log":
      return {
        type: "log",
        entries: data.entries.map((e) => ({
          title: formatLabel(e.title),
          subtitle: formatLabel(e.subtitle),
          dates: [e.dateStart, e.dateEnd].filter(Boolean).join(" — "),
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

function transformSection(section: CvSection): CvDisplaySection {
  return {
    id: section.id,
    title: section.title,
    type: section.type,
    placement: section.placement,
    visible: section.visible,
    content: transformSectionData(section.data),
  }
}

/** Build CvData purely from CV content — no server dependencies */
export function createCvData(cv: CvContent): CvData {
  return {
    name: formatLabel(cv.name || "") || "Francesco Bassignana",
    title: formatLabel(cv.title || "") || "Full Stack Developer",
    location: cv.location || ADDRESS,
    piva: cv.piva || PIVA,
    email: cv.email || CONTACT_EMAIL,
    phone: cv.phone || CONTACT_PHONE,
    sections: cv.sections
      .filter((s) => s.visible)
      .map(transformSection),
  }
}
