import { getDb } from "@/lib/mongodb"
import {
  cvContentSchema,
  emptyCvContent,
  migrateCvContent,
  type CvContent,
  type CvSection,
  type PersistedCvContent,
} from "@/lib/cv-content"
import type { PortfolioContent } from "@/lib/default-content"

const COLLECTION_NAME = "cv_content"
const DOCUMENT_ID = "cv_content"

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/** Build an initial CvContent from portfolio data (section-based) */
export function cvContentFromPortfolio(portfolio: PortfolioContent): CvContent {
  const sections: CvSection[] = []

  // ── Sidebar ──
  sections.push({
    id: "profile",
    title: "Profile",
    type: "text",
    placement: "sidebar",
    visible: true,
    data: { type: "text", content: portfolio.profileData.bio || "" },
  })

  const skillGroups = [
    { category: "Frontend", items: [...portfolio.skillsData.frontend] },
    { category: "Backend", items: [...portfolio.skillsData.backend] },
    { category: "DevOps", items: [...portfolio.skillsData.devops] },
  ].filter((g) => g.items.length > 0)
  if (skillGroups.length > 0) {
    sections.push({
      id: "skills",
      title: "Skills",
      type: "tags",
      placement: "sidebar",
      visible: true,
      data: { type: "tags", groups: skillGroups },
    })
  }

  sections.push({
    id: "languages",
    title: "Languages",
    type: "simple-list",
    placement: "sidebar",
    visible: true,
    data: { type: "simple-list", items: ["Italian — Native", "English — Cambridge B2 Certified"] },
  })

  sections.push({
    id: "certs",
    title: "Certifications",
    type: "simple-list",
    placement: "sidebar",
    visible: true,
    data: { type: "simple-list", items: ["Certified Cambridge B2 English Level"] },
  })

  sections.push({
    id: "links",
    title: "Links",
    type: "links",
    placement: "sidebar",
    visible: true,
    data: {
      type: "links",
      items: [
        { label: "Email", url: "quicksolver02@gmail.com" },
        { label: "GitHub", url: "https://github.com/bacobax" },
        { label: "LinkedIn", url: "https://www.linkedin.com/in/francesco-bassignana/" },
      ],
    },
  })

  // ── Main ──
  if (portfolio.experienceLog.length > 0) {
    sections.push({
      id: "experience",
      title: "Experience",
      type: "log",
      placement: "main",
      visible: true,
      data: {
        type: "log",
        entries: portfolio.experienceLog.map((e) => ({
          id: uid(),
          title: e.title,
          subtitle: e.company,
          dateStart: e.year,
          dateEnd: "",
          description: e.cvDescription?.trim() || e.description,
          tags: [...e.tags],
        })),
      },
    })
  }

  const allProjects = portfolio.projectCategories.flatMap((cat) =>
    cat.projects.filter((p) => p.showInCv !== false).map((p) => ({
      id: uid(),
      title: p.title,
      subtitle: cat.name,
      dateStart: p.status || "",
      dateEnd: "",
      description: p.cvDescription?.trim() || p.description,
      tags: Object.entries(p.metrics || {}).map(([k, v]) => `${k}: ${v}`),
      url: p.githubUrl || undefined,
    })),
  )
  if (allProjects.length > 0) {
    sections.push({
      id: "projects",
      title: "Projects",
      type: "log",
      placement: "main",
      visible: true,
      data: { type: "log", entries: allProjects },
    })
  }

  if (portfolio.educationLog.length > 0) {
    sections.push({
      id: "education",
      title: "Education",
      type: "log",
      placement: "main",
      visible: true,
      data: {
        type: "log",
        entries: portfolio.educationLog.map((e) => ({
          id: uid(),
          title: e.degree,
          subtitle: e.institution,
          dateStart: e.year,
          dateEnd: "",
          description: e.cvDescription?.trim() || e.description,
          tags: [...e.tags],
        })),
      },
    })
  }

  sections.push({
    id: "awards",
    title: "Awards",
    type: "simple-list",
    placement: "main",
    visible: true,
    data: { type: "simple-list", items: [] },
  })

  sections.push({
    id: "publications",
    title: "Publications",
    type: "simple-list",
    placement: "main",
    visible: true,
    data: { type: "simple-list", items: [] },
  })

  return {
    name: portfolio.profileData.name,
    title: portfolio.profileData.title,
    sections,
  }
}

/** Check if CV content is essentially empty */
function isCvContentEmpty(cv: CvContent): boolean {
  const hasData = cv.sections.some((s) => {
    switch (s.data.type) {
      case "log": return s.data.entries.length > 0
      case "tags": return s.data.groups.length > 0
      case "text": return s.data.content.trim().length > 0
      case "links": return s.data.items.length > 0
      case "simple-list": return s.data.items.length > 0
    }
  })
  return !hasData && !cv.name && !cv.title
}

export async function loadCvContent(): Promise<CvContent> {
  try {
    const db = await getDb()
    const document = await db
      .collection(COLLECTION_NAME)
      .findOne<{ _id: string } & Record<string, unknown>>({ _id: DOCUMENT_ID } as any)

    if (!document) {
      return emptyCvContent()
    }

    const { _id: _ignoredId, ...rest } = document
    // Migrate old format if needed
    const migrated = migrateCvContent(rest as Record<string, any>)
    const parsed = cvContentSchema.safeParse(migrated)

    if (!parsed.success) {
      console.error("Failed to parse CV content", parsed.error)
      return emptyCvContent()
    }

    return parsed.data as CvContent
  } catch (error) {
    console.error("Failed to load CV content", error)
    return emptyCvContent()
  }
}

/**
 * Load CV content, auto-initializing from portfolio if empty.
 */
export async function loadCvContentWithFallback(portfolio: PortfolioContent): Promise<CvContent> {
  const cv = await loadCvContent()
  if (isCvContentEmpty(cv)) {
    const initialized = cvContentFromPortfolio(portfolio)
    await saveCvContent(initialized as PersistedCvContent)
    return initialized
  }
  return cv
}

export async function saveCvContent(content: PersistedCvContent): Promise<void> {
  const db = await getDb()
  await db.collection(COLLECTION_NAME).updateOne(
    { _id: DOCUMENT_ID } as any,
    { $set: content, $setOnInsert: { _id: DOCUMENT_ID } },
    { upsert: true },
  )
}
