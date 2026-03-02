import { getDb } from "@/lib/mongodb"
import {
  cvContentSchema,
  emptyCvContent,
  type CvContent,
  type CvExperienceEntry,
  type CvEducationEntry,
  type CvProjectEntry,
  type PersistedCvContent,
} from "@/lib/cv-content"
import type { PortfolioContent } from "@/lib/default-content"

const COLLECTION_NAME = "cv_content"
const DOCUMENT_ID = "cv_content"

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/** Build an initial CvContent from portfolio data */
export function cvContentFromPortfolio(portfolio: PortfolioContent): CvContent {
  const experience: CvExperienceEntry[] = portfolio.experienceLog.map((e, i) => ({
    id: uid(),
    year: e.year,
    title: e.title,
    company: e.company,
    description: e.cvDescription?.trim() || e.description,
    tags: [...e.tags],
    source: "portfolio",
    portfolioIndex: i,
  }))

  const education: CvEducationEntry[] = portfolio.educationLog.map((e, i) => ({
    id: uid(),
    year: e.year,
    degree: e.degree,
    institution: e.institution,
    description: e.cvDescription?.trim() || e.description,
    tags: [...e.tags],
    source: "portfolio",
    portfolioIndex: i,
  }))

  const projects: CvProjectEntry[] = portfolio.projectCategories.flatMap((cat) =>
    cat.projects
      .filter((p) => p.showInCv !== false)
      .map((p, pi) => ({
        id: uid(),
        title: p.title,
        category: cat.name,
        description: p.cvDescription?.trim() || p.description,
        status: p.status,
        metrics: { ...p.metrics },
        githubUrl: p.githubUrl,
        showInCv: true,
        source: "portfolio" as const,
        portfolioCategoryId: cat.id,
        portfolioProjectIndex: pi,
      })),
  )

  return {
    name: portfolio.profileData.name,
    title: portfolio.profileData.title,
    summary: portfolio.profileData.bio,
    experience,
    education,
    projects,
    certs: ["Certified Cambridge B2 English Level"],
    languages: ["Italian — Native", "English — Cambridge B2 Certified"],
    awards: [],
    publications: [],
    skills: {
      FRONTEND: [...portfolio.skillsData.frontend],
      BACKEND: [...portfolio.skillsData.backend],
      DEVOPS: [...portfolio.skillsData.devops],
    },
  }
}

/** Check if CV content is essentially empty (no meaningful data) */
function isCvContentEmpty(cv: CvContent): boolean {
  return (
    cv.experience.length === 0 &&
    cv.education.length === 0 &&
    cv.projects.length === 0 &&
    !cv.name &&
    !cv.title &&
    !cv.summary
  )
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
    const parsed = cvContentSchema.safeParse(rest)

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
 * Also persists the initialized data so it's there next time.
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
