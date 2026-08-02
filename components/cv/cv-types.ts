/* ── Section display content (after formatting) ── */
export type CvDisplayContent =
  | { type: "log"; entries: CvDisplayLogEntry[] }
  | { type: "tags"; groups: { category: string; items: string[] }[] }
  | { type: "text"; text: string }
  | { type: "links"; items: { label: string; url: string }[] }
  | { type: "simple-list"; items: string[] }

export interface CvDisplayLogEntry {
  title: string
  subtitle: string
  dates: string
  bullets: string[]
  tags: string[]
  url?: string
}

export interface CvDisplaySection {
  id: string
  title: string
  type: "log" | "tags" | "text" | "links" | "simple-list"
  placement: "sidebar" | "main"
  visible: boolean
  content: CvDisplayContent
}

/* ── Top-level CvData passed to layouts ── */
export type CvData = {
  name: string
  title: string
  location: string
  piva: string
  email: string
  phone: string
  profileExtras?: CvProfileExtras
  targetCountry?: CvCountry
  documentLanguage?: CvLocale
  regionalOptions?: CvRegionalOptions
  targetRoleOverride?: string
  summaryOverride?: string
  sections: CvDisplaySection[]
}

export type { CvLayoutId }

export interface CvLayoutMeta {
  id: CvLayoutId
  label: string
}

export const CV_LAYOUTS: CvLayoutMeta[] = [
  { id: "british_irish", label: "British & Irish" },
  { id: "germanic_tabular", label: "Germanic Tabular" },
  { id: "nordic_concise", label: "Nordic Concise" },
  { id: "french_speaking_concise", label: "French-Speaking Concise" },
  { id: "dutch_tailored", label: "Dutch Tailored" },
  { id: "southern_european", label: "Southern European" },
  { id: "europass_friendly_structured", label: "Europass-Friendly" },
  { id: "post_soviet_local_resume", label: "Post-Soviet Local" },
]
import type { CvProfileExtras } from "@/lib/cv-content"
import type {
  CvCountry,
  CvLayoutId,
  CvLocale,
  CvRegionalOptions,
} from "@/lib/cv-templates"
