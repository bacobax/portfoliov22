/** Local visual smoke check. Browser APIs are mocked; this never writes to Atlas.
 * CV_PLAYWRIGHT_MODULE can point to a bundled Playwright installation.
 */
import { createRequire } from "node:module"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { professionalCvFixture } from "../tests/fixtures/professional-cv"
import { createInitialHub, materializeCvPresets, applyEditorOperations, canonicalCvSeedFromHub } from "../lib/content-hub"
import { cloneDefaultContent } from "../lib/default-content"

const expectedSectionOrder = ["Profile", "Experience", "Technical skills", "Selected projects", "Education", "Links"]

async function extractPdfText(path: string): Promise<{ text: string; pages: string[] }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const bytes = new Uint8Array(await readFile(path))
  const document = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise
  const pages: string[] = []
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "").join(""))
    }
  } finally {
    await document.destroy()
  }
  return {
    pages,
    text: pages.join("\n").replace(/\s+/g, " ").trim(),
  }
}

async function assertAtsPdf(path: string): Promise<void> {
  const { text, pages } = await extractPdfText(path)
  const blankPage = pages.findIndex((page) => page.trim().length === 0)
  if (blankPage >= 0) throw new Error(`${path}: page ${blankPage + 1} is blank`)
  for (const required of [
    "Alex Morgan",
    "AI & Full Stack Engineer",
    "alex@example.com",
    "+41 00 000 00 00",
    "Sep 2025 - Present",
    "https://linkedin.com/in/example",
  ]) {
    if (!text.includes(required)) throw new Error(`${path}: missing extracted ATS text: ${required}`)
  }
  let cursor = -1
  for (const heading of expectedSectionOrder) {
    const next = text.indexOf(heading, cursor + 1)
    if (next <= cursor) throw new Error(`${path}: section is missing or out of order: ${heading}`)
    cursor = next
  }
  if (text.includes("HIDDEN-TAX-ID")) throw new Error(`${path}: hidden tax ID leaked into the PDF`)
}

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
    await page.locator(".cv-document--visual").waitFor()
    await page.locator('[data-cv-output="ats-print"]').waitFor({ state: "attached" })
    await page.getByRole("tab", { name: "Design", exact: true }).click()
    const savePdf = async (name: string) => {
      const path = join(output, name)
      await page.locator('[data-cv-output="ats-print"]').waitFor({ state: "attached" })
      await page.waitForFunction(() => {
        const element = document.querySelector('[data-cv-output="ats-print"]')
        return element && getComputedStyle(element).display === "none"
      })
      await page.pdf({ path, preferCSSPageSize: true, displayHeaderFooter: false, printBackground: true })
      await assertAtsPdf(path)
    }
    await page.getByLabel("Presentation").selectOption("regional")
    await page.waitForTimeout(900)
    await savePdf("regional.pdf")
    await page.getByRole("button", { name: "Apply professional defaults" }).click()
    await page.waitForTimeout(900)
    await page.screenshot({ path: join(output, "editor-desktop.png") })
    await savePdf("single-column.pdf")
    await page.getByLabel("Content flow").selectOption("sidebar")
    await page.getByLabel("Sidebar side").selectOption("right")
    await page.waitForTimeout(900)
    await savePdf("sidebar-right.pdf")
    await page.getByRole("button", { name: "Apply professional defaults" }).click()
    await page.getByLabel("Paper size").selectOption("Letter")
    await page.waitForTimeout(900)
    await savePdf("letter.pdf")
    for (const alignment of ["left", "above"]) {
      await page.getByLabel("Date alignment").selectOption(alignment)
      await page.waitForTimeout(900)
      await savePdf(`dates-${alignment}.pdf`)
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
    await page.locator(".cv-document--visual").waitFor()
    await page.locator('[data-cv-output="ats-print"]').waitFor({ state: "attached" })
    await page.locator(".cv-document--visual img").evaluate((image: HTMLImageElement) => image.decode())
    await savePdf("long-entry.pdf")
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole("tab", { name: "Design", exact: true }).click()
    await page.screenshot({ path: join(output, "editor-mobile.png") })
    if (errors.length) throw new Error(errors.join("\n"))
    console.log(JSON.stringify({ output, errors }, null, 2))
  } finally { await browser.close() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
