import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { AtsPrintCvLayout } from "@/components/cv/ats-print-layout"
import { createCvData } from "@/lib/cv-data-transform"
import { cvDesignSchema } from "@/lib/cv-document"
import { professionalCvFixture } from "./fixtures/professional-cv"

function dataWith(design: Partial<ReturnType<typeof cvDesignSchema.parse>> = {}, description?: string) {
  const preset = professionalCvFixture()
  preset.design = cvDesignSchema.parse({ ...preset.design, ...design })
  const exp = preset.content.sections.find((s) => s.id === "experience")!
  if (description !== undefined && exp.data.type === "log") exp.data.entries[0].description = description
  return createCvData(preset.content, preset)
}

describe("ATS layout screen mode", () => {
  it("adds the screen class only when asked", () => {
    expect(renderToStaticMarkup(<AtsPrintCvLayout data={dataWith()} screen />)).toContain("ats-print-cv--screen")
    expect(renderToStaticMarkup(<AtsPrintCvLayout data={dataWith()} />)).not.toContain('class="cv-document ats-print-cv ats-print-cv--screen')
  })
  it("clamps body text to 9–13 pt without the old 10.5 floor", () => {
    expect(renderToStaticMarkup(<AtsPrintCvLayout data={dataWith({ baseFontPt: 7 })} />)).toContain("--ats-font-size:9pt")
    expect(renderToStaticMarkup(<AtsPrintCvLayout data={dataWith({ baseFontPt: 10 })} />)).toContain("--ats-font-size:10pt")
  })
  it("renders marks, never raw asterisks", () => {
    const html = renderToStaticMarkup(<AtsPrintCvLayout data={dataWith({}, "Led **10** people *remotely*\n- shipped **v2**")} />)
    expect(html).toContain("Led <strong>10</strong> people <em>remotely</em>")
    expect(html).toContain("shipped <strong>v2</strong>")
    expect(html).not.toMatch(/\*\*|\*remotely/)
  })
  it("keeps paragraphs and bullets whole across pages, and scales headings with the body", () => {
    const html = renderToStaticMarkup(<AtsPrintCvLayout data={dataWith()} />)
    expect(html).toMatch(/p, \.ats-print-cv[^{]*li[^{]*\{ break-inside:avoid/)
    expect(html).toContain("font-size:1.2381em")
    expect(html).not.toMatch(/h2 \{[^}]*font-size:13pt/)
  })
  it("never prints the screen copy", () => {
    expect(renderToStaticMarkup(<AtsPrintCvLayout data={dataWith()} />)).toMatch(/@media print \{[^@]*\.ats-print-cv--screen \{ display:none !important; \}/)
  })
})

describe("design schema", () => {
  it("accepts a target page count of 1–6", () => {
    expect(cvDesignSchema.parse({ targetPages: 2 }).targetPages).toBe(2)
    expect(cvDesignSchema.parse({}).targetPages).toBeUndefined()
    expect(cvDesignSchema.safeParse({ targetPages: 0 }).success).toBe(false)
    expect(cvDesignSchema.safeParse({ targetPages: 7 }).success).toBe(false)
  })
})
