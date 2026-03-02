import { getDb } from "@/lib/mongodb"
import {
  cvPresetsDocumentSchema,
  defaultPresetsDocument,
  type CvPresetsDocument,
  type CvPreset,
  type PersistedCvPresetsDocument,
} from "@/lib/cv-presets"
import { cvContentFromPortfolio } from "@/lib/cv-content-db"
import type { PortfolioContent } from "@/lib/default-content"

const COLLECTION_NAME = "cv_presets"
const DOCUMENT_ID = "cv_presets"

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/** Load raw presets from MongoDB */
export async function loadCvPresets(): Promise<CvPresetsDocument> {
  try {
    const db = await getDb()
    const doc = await db
      .collection(COLLECTION_NAME)
      .findOne<{ _id: string } & Record<string, unknown>>({ _id: DOCUMENT_ID } as any)

    if (!doc) return defaultPresetsDocument()

    const { _id: _ignoredId, ...rest } = doc
    const parsed = cvPresetsDocumentSchema.safeParse(rest)

    if (!parsed.success) {
      console.error("Failed to parse CV presets", parsed.error)
      return defaultPresetsDocument()
    }

    return parsed.data as CvPresetsDocument
  } catch (error) {
    console.error("Failed to load CV presets", error)
    return defaultPresetsDocument()
  }
}

/**
 * Load presets, auto-initializing two defaults from portfolio if empty.
 */
export async function loadCvPresetsWithFallback(
  portfolio: PortfolioContent,
): Promise<CvPresetsDocument> {
  const doc = await loadCvPresets()

  if (doc.presets.length === 0) {
    const content = cvContentFromPortfolio(portfolio)
    const defaults: CvPreset[] = [
      {
        id: uid(),
        name: "Standard",
        layout: "classic",
        visible: true,
        content,
      },
      {
        id: uid(),
        name: "Résumé",
        layout: "resume",
        visible: true,
        content: { ...content },
      },
    ]
    const initialized: CvPresetsDocument = { presets: defaults }
    await saveCvPresets(initialized as PersistedCvPresetsDocument)
    return initialized
  }

  return doc
}

export async function saveCvPresets(doc: PersistedCvPresetsDocument): Promise<void> {
  const db = await getDb()
  await db.collection(COLLECTION_NAME).updateOne(
    { _id: DOCUMENT_ID } as any,
    { $set: doc, $setOnInsert: { _id: DOCUMENT_ID } },
    { upsert: true },
  )
}
