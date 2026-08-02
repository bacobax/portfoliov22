import "dotenv/config"

import { MongoClient, type Document } from "mongodb"

import {
  CONTENT_HUB_COLLECTION,
  CONTENT_HUB_ID,
  createInitialHub,
  contentHubDocumentSchema,
  stableContentId,
  validateHubReferences,
  type ContentHubDocument,
  type SharedCvSection,
} from "../lib/content-hub"
import { migrateContentHubV2ToV3 } from "../lib/content-hub-v3-migration"
import { cvContentSchema, migrateCvContent } from "../lib/cv-content"
import { createRegionalPreset, type CvPreset } from "../lib/cv-presets"
import { legacyLayoutMap } from "../lib/content-hub-v3-migration"
import {
  persistedPortfolioContentSchema,
  withDefaultCustomColor,
} from "../lib/default-content"

const dryRun = process.argv.includes("--dry-run")
const repair = process.argv.includes("--repair")
const uri = process.env.MONGODB_ATLAS_URI
if (!uri) throw new Error("MONGODB_ATLAS_URI is not set")

const client = new MongoClient(uri)

const withoutId = (value: Record<string, unknown> | null) => {
  if (!value) return null
  const { _id: _ignored, ...rest } = value
  return rest
}

const resolvedPresetsFromRaw = (raw: Record<string, unknown> | null): CvPreset[] => {
  const presets = Array.isArray(raw?.presets) ? raw.presets : []
  return presets.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return []
    const preset = candidate as Record<string, unknown>
    const content = preset.content
    if (!content || typeof content !== "object") return []
    const parsedContent = cvContentSchema.safeParse(
      migrateCvContent(content as Parameters<typeof migrateCvContent>[0]),
    )
    const legacyLayout = preset.layout === "resume" ? "resume" : "classic"
    if (!parsedContent.success) return []
    const migrated = createRegionalPreset({
      name: String(preset.name ?? "Migrated CV"),
      country: "Italy",
      locale: "en",
      layout: legacyLayoutMap[legacyLayout],
      sourceContent: parsedContent.data,
    })
    migrated.id = String(preset.id ?? migrated.id)
    migrated.visible = preset.visible !== false
    return [migrated]
  })
}

const addMissingLegacyExtras = (
  hub: ReturnType<typeof createInitialHub>,
  legacyRaw: Record<string, unknown> | null,
) => {
  if (!legacyRaw) return
  const migrated = migrateCvContent(legacyRaw as Parameters<typeof migrateCvContent>[0])
  const sections = Array.isArray(migrated.sections) ? migrated.sections : []
  const bound = new Set(["profile", "skills", "links", "experience", "projects", "education"])
  for (const candidate of sections) {
    if (!candidate || typeof candidate !== "object") continue
    const section = candidate as Record<string, unknown>
    if (bound.has(String(section.id))) continue
    const data = section.data
    if (!data || typeof data !== "object") continue
    const serialized = JSON.stringify(data)
    if (hub.sharedSections.some((item) => JSON.stringify(item.data) === serialized)) continue
    hub.sharedSections.push({
      id: stableContentId("cv-section", [section.id, section.title, serialized]),
      title: String(section.title ?? section.id ?? "CV section"),
      type: String(section.type ?? "simple-list") as SharedCvSection["type"],
      data: data as SharedCvSection["data"],
    })
  }
}

async function main() {
 try {
  await client.connect()
  const db = client.db()
  const existing = await db
    .collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
    .findOne({ _id: CONTENT_HUB_ID })
  if (existing && !repair) {
    if (existing.schemaVersion === 2) {
      const now = new Date().toISOString()
      const migrated = migrateContentHubV2ToV3(existing, now)
      const referenceErrors = validateHubReferences(migrated)
      const report = {
        status: dryRun ? "v3-dry-run" : "migrated-to-v3",
        fromSchemaVersion: 2,
        schemaVersion: migrated.schemaVersion,
        revision: migrated.revision,
        presetCount: migrated.presets.length,
        sharedSectionCount: migrated.sharedSections.length,
        legacyLayouts: (existing.presets as Array<{ layout?: unknown }>).map((preset) => preset.layout),
        regionalLayouts: migrated.presets.map((preset) => preset.layout),
        targetCountries: [...new Set(migrated.presets.map((preset) => preset.targetCountry))],
        referenceErrors,
      }
      if (referenceErrors.length > 0) throw new Error("V3 migration has dangling references")
      if (!dryRun) {
        await db.collection<{ _id: string } & Document>("content_hub_backups").insertOne({
          _id: `content-hub-v2-${now}`,
          createdAt: now,
          source: "content_hub_v2",
          document: existing,
        })
        const result = await db
          .collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
          .replaceOne(
            { _id: CONTENT_HUB_ID, schemaVersion: 2, revision: existing.revision },
            migrated as ContentHubDocument & Document,
          )
        if (result.modifiedCount !== 1) throw new Error("Content hub changed during v3 migration")
      }
      console.log(JSON.stringify(report, null, 2))
    } else {
      const parsed = contentHubDocumentSchema.safeParse(existing)
      if (!parsed.success) throw new Error(`Existing content hub is invalid: ${parsed.error.message}`)
      const referenceErrors = validateHubReferences(parsed.data as ReturnType<typeof createInitialHub>)
      console.log(JSON.stringify({ status: "already-migrated", dryRun, revision: existing.revision, referenceErrors }, null, 2))
      process.exitCode = referenceErrors.length === 0 ? 0 : 1
    }
  } else {
    const backup = repair
      ? await db
          .collection<{ _id: string } & Document>("content_hub_backups")
          .findOne({}, { sort: { createdAt: -1 } })
      : null
    const backupSources = backup?.sources as Record<string, Record<string, unknown> | null> | undefined
    const [portfolioRaw, presetsRaw, cvRaw] = backupSources
      ? [
          backupSources.portfolio_content,
          backupSources.cv_presets,
          backupSources.cv_content,
        ]
      : await Promise.all([
          db.collection<{ _id: string } & Document>("portfolio_content").findOne({ _id: "portfolio_content" }),
          db.collection<{ _id: string } & Document>("cv_presets").findOne({ _id: "cv_presets" }),
          db.collection<{ _id: string } & Document>("cv_content").findOne({ _id: "cv_content" }),
        ])
    if (!portfolioRaw) throw new Error("portfolio_content/portfolio_content is missing")

    const portfolioCandidate = withoutId(portfolioRaw as Record<string, unknown>)
    const parsedPortfolio = persistedPortfolioContentSchema.safeParse(portfolioCandidate)
    if (!parsedPortfolio.success) {
      throw new Error(`Legacy portfolio is invalid: ${parsedPortfolio.error.message}`)
    }
    const resolvedPresets = resolvedPresetsFromRaw(
      withoutId(presetsRaw as Record<string, unknown> | null),
    )
    const now = new Date().toISOString()
    const hub = createInitialHub(
      withDefaultCustomColor(parsedPortfolio.data, portfolioRaw.customColor),
      resolvedPresets,
      now,
    )
    addMissingLegacyExtras(hub, withoutId(cvRaw as Record<string, unknown> | null))

    const parsedHub = contentHubDocumentSchema.safeParse(hub)
    if (!parsedHub.success) throw new Error(`Migrated hub is invalid: ${parsedHub.error.message}`)
    const referenceErrors = validateHubReferences(hub)
    const report = {
      status: dryRun ? (repair ? "repair-dry-run" : "dry-run") : (repair ? "repaired" : "migrated"),
      schemaVersion: hub.schemaVersion,
      experienceCount: hub.portfolio.experienceLog.length,
      educationCount: hub.portfolio.educationLog.length,
      projectCount: hub.portfolio.projectCategories.reduce(
        (total, category) => total + category.projects.length,
        0,
      ),
      presetCount: hub.presets.length,
      sharedSectionCount: hub.sharedSections.length,
      contactLinkCount: hub.portfolio.contactData.links.length,
      hasContactEmail: hub.portfolio.contactData.email.trim().length > 0,
      profileBioLength: hub.portfolio.profileData.bio.length,
      overrideCount: hub.presets.reduce(
        (total, preset) => total + Object.keys(preset.overrides).length,
        0,
      ),
      referenceErrors,
    }
    if (referenceErrors.length > 0) {
      console.log(JSON.stringify(report, null, 2))
      throw new Error("Migration has dangling references")
    }

    if (!dryRun) {
      const migrationId = `content-hub-${now}`
      if (repair) {
        await db
          .collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
          .replaceOne({ _id: CONTENT_HUB_ID }, hub as ContentHubDocument & Document)
      } else {
        await db.collection<{ _id: string } & Document>("content_hub_backups").insertOne({
          _id: migrationId,
          createdAt: now,
          sources: {
            portfolio_content: portfolioRaw,
            cv_presets: presetsRaw,
            cv_content: cvRaw,
          },
        })
        await db
          .collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
          .insertOne(hub as ContentHubDocument & Document)
      }
    }
    console.log(JSON.stringify(report, null, 2))
  }
 } finally {
   await client.close()
 }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
