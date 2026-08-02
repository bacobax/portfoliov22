import type { Document } from "mongodb"

import {
  CONTENT_HUB_COLLECTION,
  CONTENT_HUB_ID,
  applyEditorOperations,
  canonicalCvSeedFromHub,
  contentHubDocumentSchema,
  materializeCvPresets,
  type ContentHubDocument,
  type EditorOperation,
} from "@/lib/content-hub"
import { getDb } from "@/lib/mongodb"

export async function loadContentHub(): Promise<ContentHubDocument | null> {
  const db = await getDb()
  const document = await db
    .collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
    .findOne({ _id: CONTENT_HUB_ID })
  if (!document) return null

  if (document.schemaVersion !== 3) {
    return null
  }

  const parsed = contentHubDocumentSchema.safeParse(document)
  if (!parsed.success) {
    console.error("Failed to parse canonical content hub", parsed.error)
    throw new Error("Canonical content hub is invalid")
  }
  return parsed.data as ContentHubDocument
}

export async function requireContentHub(): Promise<ContentHubDocument> {
  const hub = await loadContentHub()
  if (!hub) {
    throw new Error("CONTENT_HUB_MIGRATION_REQUIRED")
  }
  return hub
}

export type ContentHubUpdateResult =
  | { success: true; hub: ContentHubDocument }
  | { success: false; latest: ContentHubDocument }

export async function updateContentHub(
  baseRevision: number,
  operations: EditorOperation[],
): Promise<ContentHubUpdateResult> {
  const current = await requireContentHub()
  if (current.revision !== baseRevision) {
    return { success: false, latest: current }
  }

  const next = applyEditorOperations(current, operations)
  next.revision = current.revision + 1
  const db = await getDb()
  const result = await db
    .collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
    .replaceOne(
      { _id: CONTENT_HUB_ID, revision: baseRevision },
      next as ContentHubDocument & Document,
    )

  if (result.modifiedCount !== 1) {
    const latest = await requireContentHub()
    return { success: false, latest }
  }
  return { success: true, hub: next }
}

export const editorStateFromHub = (hub: ContentHubDocument) => ({
  revision: hub.revision,
  content: hub.portfolio,
  presets: materializeCvPresets(hub),
  presetConfigs: hub.presets,
  sharedSections: hub.sharedSections,
  cvProfileExtras: hub.cvProfileExtras,
  canonicalCvSeed: canonicalCvSeedFromHub(hub),
  updatedAt: hub.updatedAt,
})
