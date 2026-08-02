import { describe, expect, it } from "vitest"

import {
  applyEditorOperations,
  contentHubDocumentSchema,
  createInitialHub,
  editorPatchSchema,
  materializeCvPresets,
  reconcileResolvedPresets,
  validateHubReferences,
} from "@/lib/content-hub"
import { cloneDefaultContent } from "@/lib/default-content"
import { createEmptyPreset } from "@/lib/cv-presets"

const sampleHub = () => createInitialHub(cloneDefaultContent())

describe("canonical content hub", () => {
  it("normalizes stable entity ids and validates the canonical schema", () => {
    const hub = sampleHub()
    expect(contentHubDocumentSchema.safeParse(hub).success).toBe(true)
    expect(hub.portfolio.experienceLog.every((entry) => Boolean(entry.id))).toBe(true)
    expect(hub.portfolio.educationLog.every((entry) => Boolean(entry.id))).toBe(true)
    expect(
      hub.portfolio.projectCategories.every((category) =>
        category.projects.every((project) => Boolean(project.id)),
      ),
    ).toBe(true)
    expect(validateHubReferences(hub)).toEqual([])
  })

  it("materializes all presets from the same canonical facts", () => {
    const hub = sampleHub()
    const presets = materializeCvPresets(hub)
    expect(presets).toHaveLength(2)
    expect(presets[0].content.name).toBe(hub.portfolio.profileData.name)
    expect(presets[1].content.name).toBe(hub.portfolio.profileData.name)

    hub.portfolio.profileData.name = "Canonical Name"
    expect(materializeCvPresets(hub).map((preset) => preset.content.name)).toEqual([
      "Canonical Name",
      "Canonical Name",
    ])
  })

  it("does not let an empty migrated preset overwrite portfolio facts", () => {
    const portfolio = cloneDefaultContent()
    const hub = createInitialHub(portfolio, [createEmptyPreset("Empty", "germanic_tabular")])
    expect(hub.portfolio.profileData.bio).toBe(portfolio.profileData.bio)
    expect(hub.portfolio.contactData.email).toBe(portfolio.contactData.email)
    expect(hub.portfolio.contactData.links).toHaveLength(portfolio.contactData.links.length)
  })

  it("uses preset wording override, then shared CV wording, then main description", () => {
    let hub = sampleHub()
    const resolved = materializeCvPresets(hub)
    const experienceSection = resolved[0].content.sections.find(
      (section) => section.id === "experience",
    )
    if (!experienceSection || experienceSection.data.type !== "log") {
      throw new Error("Missing experience section")
    }
    experienceSection.data.entries[0].description = "Preset-only wording"
    hub = reconcileResolvedPresets(hub, resolved, resolved[0].id)

    const rematerialized = materializeCvPresets(hub)
    const first = rematerialized[0].content.sections.find(
      (section) => section.id === "experience",
    )
    const second = rematerialized[1].content.sections.find(
      (section) => section.id === "experience",
    )
    expect(first?.data.type === "log" && first.data.entries[0].description).toBe(
      "Preset-only wording",
    )
    expect(second?.data.type === "log" && second.data.entries[0].description).toBe(
      hub.portfolio.experienceLog[0].description,
    )
  })

  it("hides from one preset without deleting the canonical entity", () => {
    const hub = sampleHub()
    const entityId = hub.portfolio.experienceLog[0].id || ""
    const next = applyEditorOperations(hub, [
      {
        type: "set-visibility",
        target: {
          entityType: "experience",
          entityId,
          showcase: true,
          presetIds: [hub.presets[1].id],
        },
      },
    ])
    expect(next.portfolio.experienceLog.some((entry) => entry.id === entityId)).toBe(true)
    expect(
      next.presets[0].sections.find((section) => section.source === "experience")?.itemIds,
    ).not.toContain(entityId)
    expect(
      next.presets[1].sections.find((section) => section.source === "experience")?.itemIds,
    ).toContain(entityId)
  })

  it("creates once and applies explicitly selected destinations", () => {
    const hub = sampleHub()
    const content = structuredClone(hub.portfolio)
    content.experienceLog.push({
      id: "experience-new",
      title: "New role",
      company: "New company",
      year: "2026 - PRESENT",
      description: "Canonical description",
      tags: [],
      showcaseVisible: false,
    })
    const next = applyEditorOperations(hub, [
      {
        type: "replace-portfolio",
        content,
        visibility: [
          {
            entityType: "experience",
            entityId: "experience-new",
            showcase: false,
            presetIds: [hub.presets[0].id],
          },
        ],
      },
    ])
    expect(
      next.portfolio.experienceLog.find((entry) => entry.id === "experience-new")
        ?.showcaseVisible,
    ).toBe(false)
    expect(
      next.presets[0].sections.find((section) => section.source === "experience")?.itemIds,
    ).toContain("experience-new")
    expect(
      next.presets[1].sections.find((section) => section.source === "experience")?.itemIds,
    ).not.toContain("experience-new")
  })

  it("cascades an explicit global deletion through selections and overrides", () => {
    const hub = sampleHub()
    const projectId = hub.portfolio.projectCategories[0].projects[0].id || ""
    hub.presets[0].overrides[projectId] = { description: "Tailored" }
    const next = applyEditorOperations(hub, [
      { type: "delete-entity", entityType: "project", entityId: projectId },
    ])
    expect(
      next.portfolio.projectCategories.some((category) =>
        category.projects.some((project) => project.id === projectId),
      ),
    ).toBe(false)
    expect(next.presets.every((preset) => !preset.overrides[projectId])).toBe(true)
    expect(validateHubReferences(next)).toEqual([])
  })

  it("rejects malformed mutation batches before persistence", () => {
    expect(
      editorPatchSchema.safeParse({
        baseRevision: -1,
        operations: [{ type: "delete-entity", entityType: "unknown", entityId: "x" }],
      }).success,
    ).toBe(false)
    expect(
      editorPatchSchema.safeParse({ baseRevision: 0, operations: [] }).success,
    ).toBe(false)
  })
})
