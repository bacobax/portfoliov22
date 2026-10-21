import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { RegionalCvLayout } from "@/components/cv/regional-layout"
import { CvEditProvider, type CvEditApi } from "@/components/cv/cv-edit-context"
import {
  createTailoredCv,
  moveAtPath,
  parseTailoredCv,
  setAtPath,
  splitList,
  swapAtPath,
  tailoredPdfTitle,
  visibleTailoredData,
} from "@/lib/cv-tailor"
import { professionalCvFixture } from "./fixtures/professional-cv"

const photo = { src: "/photo.png", width: 100, height: 100 }
const noop = () => {}
const api: CvEditApi = {
  set: noop, swap: noop, move: noop, insertBullet: noop, removeBullet: noop, hideEntry: noop,
  hideSection: noop, addBullet: noop, focusKey: null, clearFocus: noop,
}

describe("tailored CV draft", () => {
  it("bakes role and summary overrides into editable fields", () => {
    const preset = professionalCvFixture()
    preset.targetRoleOverride = "GenAI Engineer"
    preset.summaryOverride = "Tailored summary."
    const draft = createTailoredCv(preset)
    expect(draft.sourcePresetId).toBe(preset.id)
    expect(draft.data.title).toBe("GenAI Engineer")
    expect(draft.data.targetRoleOverride).toBeUndefined()
    expect(draft.data.summaryOverride).toBeUndefined()
    const profile = draft.data.sections.find((section) => section.id === "profile")!
    expect(profile.content).toEqual({ type: "text", text: "Tailored summary." })
  })

  it("round-trips through validation and rejects malformed drafts", () => {
    const draft = createTailoredCv(professionalCvFixture())
    expect(parseTailoredCv(JSON.parse(JSON.stringify(draft)))).not.toBeNull()
    expect(parseTailoredCv({ ...draft, layout: "nope" })).toBeNull()
    const broken = setAtPath(draft, ["data", "sections", 0, "type"], "log")
    expect(parseTailoredCv(broken)).toBeNull()
  })

  it("edits immutably by path and swaps list items", () => {
    const draft = createTailoredCv(professionalCvFixture())
    const renamed = setAtPath(draft.data, ["sections", 1, "content", "entries", 0, "title"], "Staff engineer")
    expect(renamed).not.toBe(draft.data)
    expect(draft.data.sections[1].content.type === "log" && draft.data.sections[1].content.entries[0].title).toBe("Engineering role 1")
    expect(renamed.sections[1].content.type === "log" && renamed.sections[1].content.entries[0].title).toBe("Staff engineer")
    const swapped = swapAtPath(draft.data, ["sections"], 0, 1)
    expect(swapped.sections.map((section) => section.id).slice(0, 2)).toEqual(["experience", "profile"])
    expect(swapAtPath(draft.data, ["sections"], 0, 99)).toBe(draft.data)
    const ids = draft.data.sections.map((section) => section.id)
    const moved = moveAtPath(draft.data, ["sections"], 0, 2)
    expect(moved.sections.map((section) => section.id)).toEqual([ids[1], ids[2], ids[0], ...ids.slice(3)])
    expect(moveAtPath(draft.data, ["sections"], 2, 0).sections.map((section) => section.id).slice(0, 3)).toEqual([ids[2], ids[0], ids[1]])
    expect(moveAtPath(draft.data, ["sections"], 1, 1)).toBe(draft.data)
    expect(splitList(" a, b ,, c ")).toEqual(["a", "b", "c"])
  })

  it("drops hidden sections and entries from both the PDF data and the rendered page", () => {
    const draft = createTailoredCv(professionalCvFixture())
    let data = setAtPath(draft.data, ["sections", 1, "content", "entries", 0, "hidden"], true)
    data = setAtPath(data, ["sections", 4, "visible"], false)
    const printable = visibleTailoredData(data)
    expect(printable.sections.some((section) => section.id === "education")).toBe(false)
    const experience = printable.sections.find((section) => section.id === "experience")!
    expect(experience.content.type === "log" && experience.content.entries.map((entry) => entry.title)[0]).toBe("Engineering role 2")

    const html = renderToStaticMarkup(<RegionalCvLayout layout={draft.layout} data={data} profilePicture={photo} />)
    expect(html).not.toContain("Engineering role 1")
    expect(html).toContain("Engineering role 2")
    expect(html).not.toContain("MSc Computer Science")
  })

  it("renders plain text without a provider and editable fields with one", () => {
    const draft = createTailoredCv(professionalCvFixture())
    const plain = renderToStaticMarkup(<RegionalCvLayout layout={draft.layout} data={draft.data} profilePicture={photo} />)
    expect(plain).toContain("<h1>Alex Morgan</h1>")
    expect(plain.toLowerCase()).not.toContain("contenteditable")
    expect(plain).not.toContain("cv-edit-controls")

    const editable = renderToStaticMarkup(
      <CvEditProvider api={api}><RegionalCvLayout layout={draft.layout} data={draft.data} profilePicture={photo} /></CvEditProvider>,
    )
    expect(editable).toContain('contentEditable="plaintext-only"')
    expect(editable).toContain('data-cv-path="name" spellCheck="true">Alex Morgan</span>')
    expect(editable).toContain('data-cv-path="name"')
    expect(editable).toContain('data-cv-path="sections.1.content.entries.0.title"')
    expect(editable).toContain("cv-edit-controls--entry")
    expect(editable).toContain("cv-edit-controls--section")
  })

  it("names the PDF after the target application", () => {
    const draft = createTailoredCv(professionalCvFixture())
    expect(tailoredPdfTitle(draft)).toBe("Alex Morgan - CV")
    expect(tailoredPdfTitle({ ...draft, label: "Acme – GenAI" })).toBe("Alex Morgan - CV - Acme – GenAI")
  })
})
