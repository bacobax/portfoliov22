/** Local visual smoke check. Browser APIs are mocked; this never writes to Atlas.
 * CV_PLAYWRIGHT_MODULE can point to a bundled Playwright installation.
 */
import { createRequire } from "node:module"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { professionalCvFixture } from "../tests/fixtures/professional-cv"
import { createInitialHub, materializeCvPresets, applyEditorOperations, canonicalCvSeedFromHub } from "../lib/content-hub"
import { cloneDefaultContent } from "../lib/default-content"

async function main() {
  const require = createRequire(import.meta.url)
  const { chromium } = require(process.env.CV_PLAYWRIGHT_MODULE || "playwright")
  const output = await mkdtemp(join(tmpdir(), "cv-print-review-"))
  const browser = await chromium.launch({ executablePath: process.env.CV_CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
    let hub = createInitialHub(cloneDefaultContent(), [professionalCvFixture()])
    const state = () => ({ success: true, revision: hub.revision, presets: materializeCvPresets(hub), publishedPresetIds: [], canonicalCvSeed: canonicalCvSeedFromHub(hub) })
    await page.route("**/api/**", async (route: { request: () => { url: () => string; method: () => string; postDataJSON: () => { operations: Parameters<typeof applyEditorOperations>[1] } }; fulfill: (data: { status?: number; json: unknown }) => Promise<void> }) => {
      const request = route.request()
      if (request.url().endsWith("/api/auth/session")) return route.fulfill({ json: { authenticated: true } })
      if (request.url().endsWith("/api/editor/content")) {
        if (request.method() === "PATCH") { hub = applyEditorOperations(hub, request.postDataJSON().operations); hub.revision += 1 }
        return route.fulfill({ json: state() })
      }
      return route.fulfill({ status: 403, json: { error: "Disabled in print fixture" } })
    })
    const errors: string[] = []
    page.on("pageerror", (error: Error) => errors.push(error.message))
    await page.goto(process.env.CV_CHECK_URL || "http://localhost:3001/cv/edit")
    await page.locator(".cv-document").waitFor()
    await page.getByRole("tab", { name: "Design", exact: true }).click()
    await page.getByRole("button", { name: "Apply professional defaults" }).click()
    await page.waitForTimeout(900)
    await page.screenshot({ path: join(output, "editor-desktop.png") })
    await page.pdf({ path: join(output, "single-column.pdf"), preferCSSPageSize: true, displayHeaderFooter: false, printBackground: true })
    await page.getByLabel("Content flow").selectOption("sidebar")
    await page.getByLabel("Sidebar side").selectOption("right")
    await page.waitForTimeout(900)
    await page.pdf({ path: join(output, "sidebar-right.pdf"), preferCSSPageSize: true, displayHeaderFooter: false, printBackground: true })
    await page.getByRole("button", { name: "Apply professional defaults" }).click()
    await page.getByLabel("Paper size").selectOption("Letter")
    await page.waitForTimeout(900)
    await page.pdf({ path: join(output, "letter.pdf"), preferCSSPageSize: true, displayHeaderFooter: false, printBackground: true })
    for (const alignment of ["left", "above"]) {
      await page.getByLabel("Date alignment").selectOption(alignment)
      await page.waitForTimeout(900)
      await page.pdf({ path: join(output, `dates-${alignment}.pdf`), preferCSSPageSize: true, displayHeaderFooter: false, printBackground: true })
    }
    // A single role longer than a page must be allowed to split.
    const draft = materializeCvPresets(hub)[0]
    draft.design.datePlacement = "right"
    draft.regionalOptions.showPhoto = true
    draft.content.profileExtras = { drivingLicences: [], references: [], ...draft.content.profileExtras, profileImage: {
      url: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e3eaec"/><circle cx="50" cy="34" r="18" fill="#8799a2"/><path d="M15 100v-12a35 35 0 0 1 70 0v12" fill="#8799a2"/></svg>')}`,
      alt: "Synthetic portrait placeholder",
    } }
    const experience = draft.content.sections.find((s) => s.id === "experience")!
    if (experience.data.type === "log") {
      experience.data.entries = [{ ...experience.data.entries[0], description: Array.from({ length: 22 }, (_, i) => `Result ${i + 1}: Built an evaluation workflow covering realistic user questions and measured quality before releasing the service. Documented the tradeoffs, operational checks and lessons for the next iteration.`).join("\n") }]
    }
    hub = applyEditorOperations(hub, [{ type: "replace-presets", presets: [draft], activePresetId: draft.id }])
    await page.reload()
    await page.locator(".cv-document").waitFor()
    await page.locator(".cv-document img").evaluate((image: HTMLImageElement) => image.decode())
    await page.pdf({ path: join(output, "long-entry.pdf"), preferCSSPageSize: true, displayHeaderFooter: false, printBackground: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole("tab", { name: "Design", exact: true }).click()
    await page.screenshot({ path: join(output, "editor-mobile.png") })
    if (errors.length) throw new Error(errors.join("\n"))
    console.log(JSON.stringify({ output, errors }, null, 2))
  } finally { await browser.close() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
