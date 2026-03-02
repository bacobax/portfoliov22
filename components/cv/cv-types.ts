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
  sections: CvDisplaySection[]
}

export type CvLayoutId = "classic" | "resume"

export interface CvLayoutMeta {
  id: CvLayoutId
  label: string
}

export const CV_LAYOUTS: CvLayoutMeta[] = [
  { id: "classic", label: "Classic" },
  { id: "resume", label: "Résumé" },
]
