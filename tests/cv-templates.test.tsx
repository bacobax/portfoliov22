import { describe, expect, it } from "vitest"

import { createInitialHub, materializeCvPresets, validateHubReferences } from "@/lib/content-hub"
import { migrateContentHubV2ToV3 } from "@/lib/content-hub-v3-migration"
import { createCvData } from "@/lib/cv-data-transform"
import { changePresetLanguage, changePresetTemplate, createRegionalPreset, cvPresetSchema } from "@/lib/cv-presets"
import {
  COUNTRY_LOCALES,
  COUNTRY_TEMPLATE_MAP,
  CV_COUNTRIES,
  CV_LOCALES,
  CV_TEMPLATES,
  CV_TEMPLATE_BY_ID,
  CV_TEMPLATE_IDS,
  labelsForLocale,
  inferCvCountry,
  templateForCountry,
} from "@/lib/cv-templates"
import { cloneDefaultContent } from "@/lib/default-content"

describe("regional CV catalog", () => {
  it("maps every supplied country to exactly one complete template", () => {
    expect(Object.keys(COUNTRY_TEMPLATE_MAP)).toHaveLength(CV_COUNTRIES.length)
    expect(new Set(Object.keys(COUNTRY_TEMPLATE_MAP)).size).toBe(CV_COUNTRIES.length)
    for (const country of CV_COUNTRIES) {
      const template = CV_TEMPLATE_BY_ID[templateForCountry(country)]
      expect(template.countries).toContain(country)
      expect(COUNTRY_LOCALES[country]).toContain("en")
      expect(template.sectionOrder.length).toBeGreaterThan(5)
    }
    expect(new Set(CV_TEMPLATES.map((template) => template.id))).toEqual(new Set(CV_TEMPLATE_IDS))
    for (const locale of CV_LOCALES) {
      expect(labelsForLocale(locale).experience.trim().length).toBeGreaterThan(0)
      if (locale !== "en") expect(labelsForLocale(locale).experience).not.toBe("Experience")
    }
  })

  it("creates from canonical content and localizes only template-derived headings", () => {
    const hub = createInitialHub(cloneDefaultContent())
    const source = materializeCvPresets(hub)[0].content
    const preset = createRegionalPreset({
      name: "German application",
      country: "Germany",
      locale: "de",
      sourceContent: source,
    })
    expect(preset.layout).toBe("germanic_tabular")
    expect(preset.content.sections.find((section) => section.id === "experience")?.title).toBe("Berufserfahrung")
    const custom = {
      ...preset,
      content: {
        ...preset.content,
        sections: preset.content.sections.map((section) => section.id === "projects"
          ? { ...section, title: "Selected work", titleMode: "custom" as const }
          : section),
      },
    }
    const changed = changePresetLanguage(custom, "en")
    expect(changed.content.sections.find((section) => section.id === "projects")?.title).toBe("Selected work")
    expect(changed.content.sections.find((section) => section.id === "experience")?.title).toBe("Experience")
  })

  it("changes template structure without losing content or custom headings", () => {
    const hub = createInitialHub(cloneDefaultContent())
    const preset = materializeCvPresets(hub)[0]
    preset.content.sections[0].title = "My profile"
    preset.content.sections[0].titleMode = "custom"
    preset.regionalOptions.customFooter = "Keep this footer"
    const beforeEntries = preset.content.sections.find((section) => section.id === "experience")?.data
    const changed = changePresetTemplate(preset, "british_irish")
    expect(changed.content.sections.every((section) => section.placement === "main")).toBe(true)
    expect(changed.content.sections.find((section) => section.id === preset.content.sections[0].id)?.title).toBe("My profile")
    expect(changed.content.sections.find((section) => section.id === "experience")?.data).toEqual(beforeEntries)
    expect(changed.regionalOptions.customFooter).toBe("Keep this footer")
  })

  it("rejects a document language that is not offered for the target country", () => {
    const hub = createInitialHub(cloneDefaultContent())
    const preset = createRegionalPreset({
      name: "Invalid locale",
      country: "Italy",
      locale: "it",
      sourceContent: materializeCvPresets(hub)[0].content,
    })
    expect(cvPresetSchema.safeParse({ ...preset, documentLanguage: "de" }).success).toBe(false)
  })

  it("localizes recognized dates without translating authored text", () => {
    const preset = createRegionalPreset({ name: "CV", country: "Germany", locale: "de" })
    preset.content.sections = [{
      id: "experience",
      title: "Berufserfahrung",
      titleMode: "template",
      type: "log",
      placement: "main",
      visible: true,
      data: { type: "log", entries: [{ id: "x", title: "Authored role", subtitle: "Company", dateStart: "2025-01", dateEnd: "Present", description: "Authored sentence.", tags: [] }] },
    }]
    const display = createCvData(preset.content, preset)
    const section = display.sections[0]
    expect(section.content.type === "log" && section.content.entries[0].dates).toMatch(/Jan\. 2025 — Heute/)
    expect(section.content.type === "log" && section.content.entries[0].bullets).toEqual(["Authored sentence."])
  })

  it("infers supported countries from stored locations and falls back to Italy", () => {
    expect(inferCvCountry("Manchester, United Kingdom")).toBe("United Kingdom")
    expect(inferCvCountry("Cuneo (CN), Italia")).toBe("Italy")
    expect(inferCvCountry("Remote")).toBe("Italy")
  })
})

describe("content hub v3 migration", () => {
  it("maps both legacy layouts, increments revision and preserves references", () => {
    const hub = createInitialHub(cloneDefaultContent())
    const legacy = structuredClone(hub) as unknown as Record<string, unknown> & { presets: Array<Record<string, unknown>> }
    legacy.schemaVersion = 2
    delete legacy.cvProfileExtras
    legacy.presets = hub.presets.map((preset, index) => {
      const copy = structuredClone(preset) as unknown as Record<string, unknown>
      copy.layout = index === 0 ? "classic" : "resume"
      delete copy.targetCountry
      delete copy.documentLanguage
      delete copy.templateVersion
      delete copy.regionalOptions
      return copy
    })
    ;(legacy.presets[0].sections as Array<Record<string, unknown>>).push({
      id: "custom-note",
      source: "profile",
      title: "Custom note",
      titleMode: "custom",
      type: "text",
      placement: "main",
      visible: true,
      itemIds: [],
    })
    const migrated = migrateContentHubV2ToV3(legacy, "2026-08-02T00:00:00.000Z")
    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.revision).toBe(hub.revision + 1)
    expect(migrated.presets.map((preset) => preset.layout)).toEqual([
      "germanic_tabular", "southern_european",
    ])
    expect(migrated.presets.every((preset) => preset.targetCountry === "Italy")).toBe(true)
    expect(migrated.presets[0].sections.at(-1)?.id).toBe("custom-note")
    expect(validateHubReferences(migrated)).toEqual([])
  })
})
