import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { CvEmptyState } from "@/components/cv/cv-layout-switcher"

describe("CV page with no visible presets", () => {
  it("offers the editor to a signed-in editor", () => {
    const html = renderToStaticMarkup(<CvEmptyState isAuthenticated />)
    expect(html).toContain('href="/cv/edit"')
    expect(html).toContain('href="/cv/tailor"')
  })

  it("hides editor links from visitors", () => {
    const html = renderToStaticMarkup(<CvEmptyState isAuthenticated={false} />)
    expect(html).not.toContain("/cv/edit")
    expect(html).toContain('href="/"')
  })
})
