import { BSON } from "mongodb"
import { describe, expect, it } from "vitest"
import { contentHubDocumentSchema, createInitialHub, publicCvPresets, type ContentHubDocument } from "@/lib/content-hub"
import { hydrateStoredContentHub } from "@/lib/content-hub-storage"
import { cloneDefaultContent } from "@/lib/default-content"

describe("CV snapshot persistence", () => {
  it("loads snapshots written with undefined optional fields serialized as BSON null", () => {
    const hub = createInitialHub(cloneDefaultContent())
    const stored = BSON.deserialize(BSON.serialize(hub, { ignoreUndefined: false }))
    expect(stored.publishedPresets[0].targetRoleOverride).toBeNull()
    expect(contentHubDocumentSchema.safeParse(stored).success).toBe(false)

    const restored = contentHubDocumentSchema.parse(hydrateStoredContentHub(stored)) as ContentHubDocument
    expect(publicCvPresets(restored)).toEqual(publicCvPresets(hub))
    expect(restored.revision).toBe(hub.revision)
    expect(stored.publishedPresets[0].targetRoleOverride).toBeNull()
  })

  it("omits undefined fields on new BSON writes and preserves authored values", () => {
    const hub = createInitialHub(cloneDefaultContent())
    hub.publishedPresets[0].summaryOverride = "Authored summary"
    const stored = BSON.deserialize(BSON.serialize(hub, { ignoreUndefined: true }))
    expect(stored.publishedPresets[0]).not.toHaveProperty("targetRoleOverride")
    expect(contentHubDocumentSchema.safeParse(stored).success).toBe(true)
    expect(stored.publishedPresets[0].summaryOverride).toBe("Authored summary")
  })

  it("does not hide invalid required fields", () => {
    const hub = createInitialHub(cloneDefaultContent())
    const stored = BSON.deserialize(BSON.serialize(hub, { ignoreUndefined: false }))
    stored.publishedPresets[0].name = null
    expect(contentHubDocumentSchema.safeParse(hydrateStoredContentHub(stored)).success).toBe(false)
  })
})
