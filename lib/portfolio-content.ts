import {
  cloneDefaultContent,
  persistedPortfolioContentSchema,
  type PersistedPortfolioContent,
  type PortfolioContent,
  withDefaultCustomColor,
} from "@/lib/default-content"
import { loadProjectImage } from "@/lib/cloudinary"
import { getDb } from "@/lib/mongodb"

const COLLECTION_NAME = "portfolio_content"
const DOCUMENT_ID = "portfolio_content"

const hydrateProjectImages = async (
  content: PersistedPortfolioContent,
): Promise<PersistedPortfolioContent> => {
  const hydratedCategories = await Promise.all(
    content.projectCategories.map(async (category) => {
      const projects = await Promise.all(
        category.projects.map(async (project) => {
          if (!project.image) {
            return project
          }

          const hydratedImage = await loadProjectImage(project.image)

          if (!hydratedImage) {
            return { ...project, image: undefined }
          }

          return {
            ...project,
            image: hydratedImage,
          }
        }),
      )

      return { ...category, projects }
    }),
  )

  return {
    ...content,
    projectCategories: hydratedCategories,
  }
}

export async function loadPortfolioContent(): Promise<PortfolioContent> {
  try {
    const db = await getDb()
    const document = await db
      .collection(COLLECTION_NAME)
      .findOne<{ _id: string } & Record<string, unknown>>({ _id: DOCUMENT_ID } as any)

    if (!document) {
      return cloneDefaultContent()
    }

    const { _id: _ignoredId, customColor: legacyCustomColor, ...rest } = document
    const parsed = persistedPortfolioContentSchema.safeParse(rest)

    if (!parsed.success) {
      return cloneDefaultContent()
    }

    const hydratedContent = await hydrateProjectImages(parsed.data as PersistedPortfolioContent)
    return withDefaultCustomColor(hydratedContent, legacyCustomColor)
  } catch (error) {
    console.error("Failed to load portfolio content", error)
    return cloneDefaultContent()
  }
}
