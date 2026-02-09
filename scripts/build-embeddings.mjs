#!/usr/bin/env node

/**
 * Semantic embeddings builder
 *
 * Minimal test plan:
 * 1) Run: npm run build:embeddings
 * 2) Confirm output file exists at OUTPUT_PATH (default public/semantic/embeddings.json)
 * 3) Start app and run semantic searches for known project/experience terms.
 */

import { gzipSync } from "node:zlib"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { MongoClient } from "mongodb"
import { env, pipeline } from "@xenova/transformers"
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, "..")

// Load env vars from workspace root (Next.js-style)
// Priority: existing process.env > .env.local > .env
dotenv.config({ path: path.join(workspaceRoot, ".env.local"), override: false })
dotenv.config({ path: path.join(workspaceRoot, ".env"), override: false })

const MODEL_ID = process.env.SEMANTIC_MODEL_ID || "Xenova/all-MiniLM-L6-v2"
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI
const MONGODB_DB = process.env.MONGODB_DB
const OUTPUT_PATH = process.env.OUTPUT_PATH || "public/semantic/embeddings.json"
const COLLECTION_NAME = "portfolio_content"
const DOCUMENT_ID = "portfolio_content"

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI (or MONGODB_ATLAS_URI) env var")
}

const toSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const compactText = (parts) =>
  parts
    .flatMap((part) => (typeof part === "string" ? [part] : []))
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" | ")

const projectToText = (project, category) => {
  const metrics = Object.entries(project.metrics || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ")

  return compactText([
    "project",
    category.name,
    category.id,
    project.title,
    project.status,
    project.description,
    metrics,
    project.githubUrl,
    project.projectUrl,
  ])
}

const experienceToText = (experience) =>
  compactText([
    "experience",
    experience.title,
    experience.company,
    experience.year,
    experience.description,
    Array.isArray(experience.tags) ? experience.tags.join(", ") : "",
  ])

const mapItemsFromDocument = (document) => {
  const projectItems = (document.projectCategories || []).flatMap((category, categoryIndex) =>
    (category.projects || []).map((project, projectIndex) => {
      const id = `project:${category.id || categoryIndex}:${toSlug(project.title || `project-${projectIndex}`)}`
      const text = projectToText(project, category)
      return {
        id,
        type: "project",
        text,
        meta: {
          title: project.title,
          summary: project.description,
          categoryId: category.id,
          categoryName: category.name,
          status: project.status,
          path: `/projects/${encodeURIComponent(category.id || String(categoryIndex))}/${encodeURIComponent(
            toSlug(project.title || `project-${projectIndex}`),
          )}`,
        },
      }
    }),
  )

  const experienceItems = (document.experienceLog || []).map((experience, index) => {
    const id = `experience:${index}:${toSlug(experience.title || `experience-${index}`)}`
    const text = experienceToText(experience)
    return {
      id,
      type: "experience",
      text,
      meta: {
        title: experience.title,
        summary: experience.description,
        company: experience.company,
        year: experience.year,
        tags: experience.tags || [],
      },
    }
  })

  return [...projectItems, ...experienceItems]
}

const toVector = async (extractor, text) => {
  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data)
}

const main = async () => {
  console.log(`[semantic] model=${MODEL_ID}`)
  console.log(`[semantic] output=${OUTPUT_PATH}`)

  env.allowLocalModels = false
  env.useBrowserCache = false

  const extractor = await pipeline("feature-extraction", MODEL_ID, { quantized: true })
  console.log("[semantic] embedding pipeline ready")

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = MONGODB_DB ? client.db(MONGODB_DB) : client.db()
  const collection = db.collection(COLLECTION_NAME)

  const document = await collection.findOne({ _id: DOCUMENT_ID })
  if (!document) {
    await client.close()
    throw new Error(`Document ${COLLECTION_NAME}/${DOCUMENT_ID} not found`)
  }

  const sourceItems = mapItemsFromDocument(document)
  if (sourceItems.length === 0) {
    await client.close()
    throw new Error("No project/experience items found to embed")
  }

  console.log(`[semantic] items=${sourceItems.length}`)

  const embeddedItems = []
  for (const item of sourceItems) {
    const embedding = await toVector(extractor, item.text)
    embeddedItems.push({
      id: item.id,
      type: item.type,
      text: item.text,
      embedding,
      meta: item.meta,
    })
  }

  await client.close()

  const serialized = JSON.stringify(embeddedItems)
  const resolvedOutput = path.resolve(workspaceRoot, OUTPUT_PATH)
  await mkdir(path.dirname(resolvedOutput), { recursive: true })

  if (resolvedOutput.endsWith(".gz")) {
    const gzipped = gzipSync(Buffer.from(serialized, "utf8"))
    await writeFile(resolvedOutput, gzipped)
  } else {
    await writeFile(resolvedOutput, serialized, "utf8")
  }

  console.log(`[semantic] wrote ${embeddedItems.length} embeddings to ${resolvedOutput}`)
}

main().catch((error) => {
  console.error("[semantic] failed:", error)
  process.exit(1)
})