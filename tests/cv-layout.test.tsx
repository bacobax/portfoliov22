import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { RegionalCvLayout } from "@/components/cv/regional-layout"
import { createCvData, formatLabel, splitSentences } from "@/lib/cv-data-transform"
import { cvDesignSchema, professionalCvDesign } from "@/lib/cv-document"
import { cvLinkHref, cvQualityNotes } from "@/lib/cv-quality"
import { professionalCvFixture } from "./fixtures/professional-cv"

describe("professional CV layout", () => {
  it("preserves acronyms and authored bullet boundaries, including abbreviations", () => {
    expect(formatLabel("AI & AWS / PyTorch")).toBe("AI & AWS / PyTorch")
    expect(splitSentences("- Built a U.S. service with 99.9% uptime.\n\n• Reduced latency. Improved accuracy.")).toEqual(["Built a U.S. service with 99.9% uptime.", "Reduced latency. Improved accuracy."])
  })
  it("renders single-column content in authored order with separated skills and safe links", () => {
    const preset = professionalCvFixture()
    const html = renderToStaticMarkup(<RegionalCvLayout layout={preset.layout} data={createCvData(preset.content, preset)} profilePicture={{ src: "/photo.png", width: 100, height: 100 }} />)
    const body = html.slice(html.indexOf("<article"))
    expect(body.indexOf("Experience")).toBeLessThan(body.indexOf("Technical skills"))
    expect(body.indexOf("Technical skills")).toBeLessThan(body.indexOf("Selected projects"))
    expect(body).toContain("PyTorch, CLIP, Computer vision, Diffusion models")
    expect(body).toContain('href="mailto:alex@example.com"')
    expect(body).not.toContain("HIDDEN-TAX-ID")
    expect(body).not.toContain("Curriculum Vitae")
    expect(body).not.toContain('class="region-tags')
  })
  it("hides project status without inventing dates and tolerates invalid month text", () => {
    const preset = professionalCvFixture()
    const project = preset.content.sections.find((s) => s.id === "projects")!
    if (project.data.type !== "log") throw new Error("fixture")
    project.data.entries[0].dateStart = "PRODUCTION"
    project.data.entries[0].dateEnd = "2025-13"
    const display = createCvData(preset.content, preset).sections.find((s) => s.id === "projects")!
    expect(display.content.type === "log" && display.content.entries[0].dates).toBe("2025-13")
  })
  it("applies defaults as a design-only action and accepts old version-one settings", () => {
    const preset = professionalCvFixture()
    const contentBefore = structuredClone(preset.content)
    const design = professionalCvDesign({ ...preset.design, baseFontPt: 7, pageBreakBefore: ["projects"] })
    expect(design.baseFontPt).toBe(10.5)
    expect(design.columns).toBe("single")
    expect(design.pageBreakBefore).toEqual([])
    expect(preset.content).toEqual(contentBefore)
    expect(cvDesignSchema.parse({ baseFontPt: 9.5 }).baseFontPt).toBe(9.5)
    expect(cvQualityNotes({ ...preset, design: { ...design, baseFontPt: 8 } })).toContain("Body text is below 10.5 pt. Review wording and spacing before shrinking the font.")
    expect(cvLinkHref("javascript:alert(1)")).toBeUndefined()
  })
})
