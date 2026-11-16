import { describe, expect, it } from "vitest"

import { applyDisplayEdit, insertDisplayBullet, removeDisplayBullet } from "@/lib/cv-display-edit"
import { createCvData, parseCvDescription } from "@/lib/cv-data-transform"
import type { CvPreset } from "@/lib/cv-presets"
import type { CvSection } from "@/lib/cv-content"
import { professionalCvFixture } from "./fixtures/professional-cv"

function fixture(): CvPreset {
  const preset = professionalCvFixture()
  const hidden: CvSection = { id: "a", title: "Hidden", type: "text", placement: "main", visible: false, data: { type: "text", content: "secret" } }
  preset.content.sections = [hidden, ...preset.content.sections]
  const exp = preset.content.sections.find((s) => s.id === "experience")!
  if (exp.data.type === "log") exp.data.entries[0].description = "**Role** did things\n- a\n- b"
  return preset
}
const section = (preset: CvPreset, id: string) => preset.content.sections.find((s) => s.id === id)!
const entry0 = (preset: CvPreset) => { const d = section(preset, "experience").data; if (d.type !== "log") throw new Error("log"); return d.entries[0] }

describe("applyDisplayEdit", () => {
  it("routes by section id past a hidden section", () => {
    const preset = fixture()
    const data = createCvData(preset.content, preset)
    expect(data.sections[1].id).toBe("experience")
    const next = applyDisplayEdit(preset, data, ["sections", 1, "content", "entries", 0, "title"], "New")
    expect(entry0(next).title).toBe("New")
    expect(section(next, "a").data).toEqual(section(preset, "a").data)
  })
  it("edits the target role override when one is set", () => {
    const preset = { ...fixture(), targetRoleOverride: "X" }
    const next = applyDisplayEdit(preset, createCvData(preset.content, preset), ["title"], "Y")
    expect(next.targetRoleOverride).toBe("Y")
    expect(next.content.title).toBe(preset.content.title)
  })
  it("edits the CV title when there is no override", () => {
    const preset = fixture()
    expect(applyDisplayEdit(preset, createCvData(preset.content, preset), ["title"], "Y").content.title).toBe("Y")
  })
  it("edits the name", () => {
    const preset = fixture()
    expect(applyDisplayEdit(preset, createCvData(preset.content, preset), ["name"], "Sam").content.name).toBe("Sam")
  })
  it("edits one description bullet and keeps the part structure", () => {
    const preset = fixture()
    const next = applyDisplayEdit(preset, createCvData(preset.content, preset), ["sections", 1, "content", "entries", 0, "description", 1, "items", 0], "**A**")
    expect(entry0(next).description).toBe("**Role** did things\n- **A**\n- b")
    expect(parseCvDescription(entry0(next).description)[1]).toEqual({ type: "bullets", items: ["**A**", "b"] })
  })
  it("edits raw start and end dates", () => {
    const preset = fixture()
    const data = createCvData(preset.content, preset)
    const next = applyDisplayEdit(applyDisplayEdit(preset, data, ["sections", 1, "content", "entries", 0, "dateStart"], "2019"), data, ["sections", 1, "content", "entries", 0, "dateEnd"], "2021")
    expect([entry0(next).dateStart, entry0(next).dateEnd]).toEqual(["2019", "2021"])
  })
  it("edits entry tags and tag groups", () => {
    const preset = fixture()
    const data = createCvData(preset.content, preset)
    expect(entry0(applyDisplayEdit(preset, data, ["sections", 1, "content", "entries", 0, "tags"], ["Go"])).tags).toEqual(["Go"])
    const skills = applyDisplayEdit(preset, data, ["sections", 2, "content", "groups", 0, "items"], ["A", "B"])
    const skillsData = section(skills, "skills").data
    expect(skillsData.type === "tags" && skillsData.groups[0].items).toEqual(["A", "B"])
  })
  it("edits a text section", () => {
    const preset = fixture()
    const next = applyDisplayEdit(preset, createCvData(preset.content, preset), ["sections", 0, "content", "text"], "Hi *there*")
    expect(section(next, "profile").data).toEqual({ type: "text", content: "Hi *there*" })
  })
  it("marks an edited section title as custom", () => {
    const preset = fixture()
    const next = applyDisplayEdit(preset, createCvData(preset.content, preset), ["sections", 1, "title"], "Work")
    expect(section(next, "experience")).toMatchObject({ title: "Work", titleMode: "custom" })
  })
  it("returns the same preset for an unknown path", () => {
    const preset = fixture()
    const data = createCvData(preset.content, preset)
    expect(applyDisplayEdit(preset, data, ["sections", 99, "title"], "x")).toBe(preset)
    expect(applyDisplayEdit(preset, data, ["email"], "x")).toBe(preset)
    expect(applyDisplayEdit(preset, data, ["sections", 1, "content", "entries", 0, "url"], "x")).toBe(preset)
  })
})

describe("display bullets", () => {
  const items = ["sections", 1, "content", "entries", 0, "description", 1, "items"] as const
  it("inserts an empty bullet that survives until filled", () => {
    const preset = fixture()
    const data = createCvData(preset.content, preset)
    const next = insertDisplayBullet(preset, data, items, 1)
    expect(entry0(next).description).toBe("**Role** did things\n- a\n-\n- b")
    const content = createCvData(next.content, next).sections[1].content
    expect(content.type === "log" && content.entries[0].description[1]).toEqual({ type: "bullets", items: ["a", "", "b"] })
  })
  it("removes a bullet", () => {
    const preset = fixture()
    const next = removeDisplayBullet(preset, createCvData(preset.content, preset), items, 0)
    expect(entry0(next).description).toBe("**Role** did things\n- b")
  })
})
