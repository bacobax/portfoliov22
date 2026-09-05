import "dotenv/config"
import { MongoClient, type Document } from "mongodb"
import { CONTENT_HUB_COLLECTION, CONTENT_HUB_ID, contentHubDocumentSchema, materializeCvPresets, type ContentHubDocument } from "../lib/content-hub"
import { hydrateStoredContentHub } from "../lib/content-hub-storage"

async function main() {
  const apply = process.argv.includes("--apply")
  const uri = process.env.MONGODB_ATLAS_URI
  if (!uri) throw new Error("MONGODB_ATLAS_URI is not set")

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB || undefined)
    const collection = db.collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
    const raw = await collection.findOne({ _id: CONTENT_HUB_ID })
    if (!raw) throw new Error("Content hub not found")
    const hydrated = hydrateStoredContentHub(raw)
    const parsed = contentHubDocumentSchema.parse(hydrated) as ContentHubDocument
    if (parsed.publicationInitialized) {
      console.log("CV document publication is already initialized; nothing to do.")
    } else {
      const next = { ...parsed, publishedPresets: materializeCvPresets(parsed), publicationInitialized: true, revision: parsed.revision + 1, updatedAt: new Date().toISOString() }
      console.log(`Would freeze ${next.publishedPresets.length} current CVs as public snapshots at revision ${next.revision}.`)
      if (apply) {
        const backupId = `${CONTENT_HUB_ID}-before-cv-documents-${Date.now()}`
        await db.collection<{ _id: string } & Document>("content_hub_backups").insertOne({ ...raw, _id: backupId, backedUpAt: new Date().toISOString() })
        const result = await collection.replaceOne({ _id: CONTENT_HUB_ID, revision: parsed.revision }, next as typeof next & Document, { ignoreUndefined: true })
        if (result.modifiedCount !== 1) throw new Error("Revision changed during migration; retry from a fresh dry run")
        console.log(`Migration complete. Backup: content_hub_backups/${backupId}`)
      } else {
        console.log("Dry run only. Re-run with --apply to write the backup and migration.")
      }
    }
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
