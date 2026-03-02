import CvCursorVisibility from "@/components/cv-cursor-visibility"
import { CvLayoutSwitcher, type PresetView } from "@/components/cv/cv-layout-switcher"
import type { CvData } from "@/components/cv/cv-types"
import type { CvContent } from "@/lib/cv-content"
import { loadCvPresetsWithFallback } from "@/lib/cv-presets-db"
import { loadPortfolioContent } from "@/lib/portfolio-content"
import profilePicture from "@/app/prof_pic.jpeg"

const CONTACT_EMAIL = "quicksolver02@gmail.com"
const CONTACT_PHONE = ""
const ADDRESS = "Via Entracque, 10, Cuneo (12100)"
const PIVA = "P.IVA: 04081230049 - QuickSolver"

const LINKS = [
  { label: "Email", url: `${CONTACT_EMAIL}` },
  { label: "GitHub", url: "https://github.com/bacobax" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/francesco-bassignana/" },
]

const splitSentences = (value: string): string[] =>
  value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

const formatLabel = (value: string): string => {
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

/** Build CvData purely from CV content */
function createCvData(cv: CvContent): CvData {
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

export default async function CvPage() {
  const portfolio = await loadPortfolioContent()
  const { presets } = await loadCvPresetsWithFallback(portfolio)

  const visiblePresets: PresetView[] = presets
    .filter((p) => p.visible)
    .map((p) => ({
      id: p.id,
      name: p.name,
      layout: p.layout,
      data: createCvData(p.content),
    }))

  return (
    <div className="cv-page">
      <CvCursorVisibility />
      <style>{`
        :root {
          color-scheme: light;
        }
        @page {
          size: A4;
          margin: 12mm;
        }
        body {
          background: #e5e7eb;
        }
        @media (pointer: fine) {
          .cv-page,
          .cv-page * {
            cursor: auto !important;
          }
        }
        @media (pointer: coarse) {
          .tech-cursor {
            display: none !important;
          }
        }
        .cv-page {
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          min-height: 100vh;
        }
        .toolbar {
          width: 210mm;
          max-width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-family: var(--font-open-sans), "Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        }
        .toolbar__layouts {
          display: flex;
          gap: 0;
          flex-wrap: wrap;
        }
        .toolbar__layout-btn {
          border: 1px solid #0f172a;
          background: transparent;
          color: #0f172a;
          padding: 8px 16px;
          font-size: 10pt;
          letter-spacing: 0.05em;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .toolbar__layout-btn:first-child {
          border-right: none;
        }
        .toolbar__layout-btn--active {
          background: #0f172a;
          color: #ffffff;
          font-weight: 700;
        }
        .toolbar__layout-btn:hover:not(.toolbar__layout-btn--active) {
          background: #f1f5f9;
        }
        .toolbar__button {
          border: 1px solid #0f172a;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 16px;
          font-size: 10pt;
          letter-spacing: 0.08em;
          font-weight: 600;
          cursor: pointer;
        }
        .toolbar__button:hover {
          background: #1e293b;
        }
        @media screen and (max-width: 768px) {
          .cv-page {
            padding: 12px 8px;
            gap: 12px;
          }
          .toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .toolbar__layouts {
            justify-content: center;
          }
          .toolbar__layout-btn {
            padding: 6px 12px;
            font-size: 9pt;
          }
          .toolbar__button {
            padding: 8px 12px;
            font-size: 9pt;
            text-align: center;
          }
        }
        @media print {
          body {
            background: #ffffff;
          }
          .cv-page {
            padding: 0;
          }
          .toolbar {
            display: none;
          }
        }
      `}</style>
      <CvLayoutSwitcher presets={visiblePresets} profilePicture={profilePicture} />
    </div>
  )
}
