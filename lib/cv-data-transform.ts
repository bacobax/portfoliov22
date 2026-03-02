import type { CvContent } from "@/lib/cv-content"
import type { CvData } from "@/components/cv/cv-types"

const CONTACT_EMAIL = "quicksolver02@gmail.com"
const CONTACT_PHONE = ""
const ADDRESS = "Via Entracque, 10, Cuneo (12100)"
const PIVA = "P.IVA: 04081230049 - QuickSolver"

const LINKS = [
  { label: "Email", url: `${CONTACT_EMAIL}` },
  { label: "GitHub", url: "https://github.com/bacobax" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/francesco-bassignana/" },
]

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

/** Build CvData purely from CV content — no server dependencies */
export function createCvData(cv: CvContent): CvData {
  return {
    name: formatLabel(cv.name || "") || "Francesco Bassignana",
    title: formatLabel(cv.title || "") || "Full Stack Developer",
    location: cv.location || ADDRESS,
    piva: cv.piva || PIVA,
    email: cv.email || CONTACT_EMAIL,
    phone: cv.phone || CONTACT_PHONE,
    links: cv.links && cv.links.length > 0 ? cv.links : LINKS,
    summary: formatLabel(cv.summary || ""),
    skills:
      cv.skills && Object.keys(cv.skills).length > 0
        ? Object.fromEntries(Object.entries(cv.skills).map(([k, v]) => [k, v.map(formatLabel)]))
        : {},
    experience: cv.experience.map((e) => ({
      role: formatLabel(e.title),
      company: formatLabel(e.company),
      location: cv.location || ADDRESS,
      dates: e.year,
      bullets: splitSentences(e.description),
      stack: e.tags.map(formatLabel),
    })),
    additionalExperience: [],
    projects: cv.projects
      .filter((p) => p.showInCv)
      .map((p) => ({
        name: formatLabel(p.title),
        role: formatLabel(p.category),
        date: `STATUS: ${formatLabel(p.status)}`,
        bullets: [
          formatLabel(p.description),
          ...Object.entries(p.metrics).map(([l, m]) => `${l.toUpperCase()}: ${m}`),
        ],
        link: p.githubUrl,
      })),
    education: cv.education.map((e) => ({
      degree: formatLabel(e.degree),
      school: formatLabel(e.institution),
      year: e.year,
      details: splitSentences(e.description),
    })),
    certs: cv.certs,
    publications: cv.publications,
    languages: cv.languages,
    awards: cv.awards,
  }
}
