import type { Document } from "mongodb"

import { getDb } from "@/lib/mongodb"
import { parseTailoredCv, type TailoredCv } from "@/lib/cv-tailor"

const COLLECTION_NAME = "cv_tailored_drafts"
/** Only the most recent tailored CV is kept. */
const DOCUMENT_ID = "current"

type StoredDraft = { _id: string; updatedAt: Date } & Document

export async function loadTailoredCv(): Promise<TailoredCv | null> {
  const db = await getDb()
  const doc = await db.collection<StoredDraft>(COLLECTION_NAME).findOne({ _id: DOCUMENT_ID })
  if (!doc) return null
  const { _id: _ignoredId, updatedAt, ...rest } = doc
  const draft = parseTailoredCv(rest)
  if (!draft) {
    console.error("Stored tailored CV failed validation; ignoring it")
    return null
  }
  return { ...draft, updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : undefined }
}

export async function saveTailoredCv(draft: TailoredCv): Promise<string> {
  const db = await getDb()
  const updatedAt = new Date()
  const { updatedAt: _ignored, ...body } = draft
  await db.collection<StoredDraft>(COLLECTION_NAME).replaceOne(
    { _id: DOCUMENT_ID },
    { ...body, updatedAt },
    { upsert: true },
  )
  return updatedAt.toISOString()
}

export async function deleteTailoredCv(): Promise<void> {
  const db = await getDb()
  await db.collection<StoredDraft>(COLLECTION_NAME).deleteOne({ _id: DOCUMENT_ID })
}
