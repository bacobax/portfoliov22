export type CvData = {
  name: string
  title: string
  location: string
  piva: string
  email: string
  phone: string
  links: { label: string; url: string }[]
  summary: string
  skills: Record<string, string[]>
  experience: {
    role: string
    company: string
    location: string
    dates: string
    bullets: string[]
    stack: string[]
  }[]
  additionalExperience: string[]
  projects: {
    name: string
    role: string
    date: string
    bullets: string[]
    link?: string
  }[]
  education: {
    degree: string
    school: string
    year: string
    details: string[]
  }[]
  certs: string[]
  publications: string[]
  languages: string[]
  awards: string[]
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
