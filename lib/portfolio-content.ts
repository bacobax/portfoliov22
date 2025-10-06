import {
  cloneDefaultContent,
  persistedPortfolioContentSchema,
  type PersistedPortfolioContent,
  type PortfolioContent,
  withDefaultCustomColor,
} from "@/lib/default-content"
import { getDb } from "@/lib/mongodb"

const COLLECTION_NAME = "portfolio_content"
const DOCUMENT_ID = "portfolio_content"

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

    return withDefaultCustomColor(parsed.data as PersistedPortfolioContent, legacyCustomColor)
  } catch (error) {
    console.error("Failed to load portfolio content", error)
    return cloneDefaultContent()
  }
}
