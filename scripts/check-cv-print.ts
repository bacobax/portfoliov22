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

/** The PDF carries the CV's text as selectable text, sections in the proof's order. */
async function assertPdfText(path: string, expectedSectionOrder: string[]): Promise<void> {
  const { text, pages } = await extractPdfText(path)
  const blankPage = pages.findIndex((page) => page.trim().length === 0)
  if (blankPage >= 0) throw new Error(`${path}: page ${blankPage + 1} is blank`)
  for (const required of [
    "Alex Morgan",
    "AI & Full Stack Engineer",
    "alex@example.com",
    "+41 00 000 00 00",
    "Sep 2025",
    "linkedin.com/in/example",
  ]) {
    if (!text.includes(required)) throw new Error(`${path}: missing extracted text: ${required}`)
  }
  let cursor = -1
  for (const heading of expectedSectionOrder) {
    const next = text.indexOf(heading, cursor + 1)
    if (next <= cursor) throw new Error(`${path}: section is missing or out of order: ${heading}`)
    cursor = next
  }
  if (text.includes("HIDDEN-TAX-ID")) throw new Error(`${path}: hidden tax ID leaked into the PDF`)
}

const squash = (value: string) => value.replace(/\s+/g, "")

/**
 * The editor's proof must show the same pages as the PDF: same count, and each
 * block the proof moved onto page N found on PDF page N. Two-column layouts mix
 * the columns in extracted text, so starts are matched by containment.
 */
async function assertPageParity(path: string, label: string, proof: { pageCount: number; starts: { page: number; text: string }[] }): Promise<void> {
  const { pages } = await extractPdfText(path)
  if (pages.length !== proof.pageCount) throw new Error(`page mismatch at ${label}: proof ${proof.pageCount} vs pdf ${pages.length}`)
  for (const { page, text } of proof.starts) {
    const expected = squash(text).slice(0, 24)
    if (!expected) continue
    if (!squash(pages[page - 1] ?? "").includes(expected)) {
      const found = pages.findIndex((pageText) => squash(pageText).includes(expected))
      console.error(pages.map((text, index) => `--- pdf page ${index + 1}: …${text.replace(/\s+/g, " ").slice(-160)}`).join("\n"))
      throw new Error(`start mismatch at ${label}: "${expected}" is on proof page ${page} but pdf page ${found + 1}`)
    }
  }
  const blankPage = pages.findIndex((page) => page.trim().length === 0)
  if (blankPage >= 0) throw new Error(`${label}: pdf page ${blankPage + 1} is blank`)
}

type Draft = ReturnType<typeof materializeCvPresets>[number]

async function main() {
  const require = createRequire(import.meta.url)
  const { chromium } = require(process.env.CV_PLAYWRIGHT_MODULE || "playwright")
  const output = await mkdtemp(join(tmpdir(), "cv-print-review-"))
  const browser = await chromium.launch({ executablePath: process.env.CV_CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
    let hub = createInitialHub(cloneDefaultContent(), [professionalCvFixture()])
    const base = structuredClone(materializeCvPresets(hub)[0])
    const state = () => ({ success: true, revision: hub.revision, presets: materializeCvPresets(hub), publishedPresetIds: [], canonicalCvSeed: canonicalCvSeedFromHub(hub) })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.route("**/api/**", async (route: any) => {
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
    page.on("console", (message: { type: () => string; text: () => string }) => { if (message.type() === "warning" && message.text().includes("cv-paged-proof")) errors.push(message.text()) })
    await page.goto(process.env.CV_CHECK_URL || "http://localhost:3000/cv/edit")

    const longEntry = (draft: Draft) => {
      const experience = draft.content.sections.find((s) => s.id === "experience")!
      if (experience.data.type === "log") {
        experience.data.entries = [{ ...experience.data.entries[0], description: Array.from({ length: 22 }, (_, i) => `- Result ${i + 1}: Built an evaluation workflow covering realistic user questions and measured the answers against a reviewed baseline.`).join("\n") }, ...experience.data.entries.slice(1)]
      }
    }
    const photo = (draft: Draft) => {
      draft.regionalOptions.showPhoto = true
      draft.content.profileExtras = { drivingLicences: [], references: [], ...draft.content.profileExtras, profileImage: {
        url: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e3eaec"/><circle cx="50" cy="34" r="18" fill="#9aa8ae"/></svg>')}`,
        alt: "Synthetic portrait placeholder",
      } }
    }
    const cases: { label: string; change: (draft: Draft) => void }[] = [
      { label: "single-9pt", change: (d) => { d.design.baseFontPt = 9 } },
      { label: "single-10.5pt", change: () => {} },
      { label: "single-12pt", change: (d) => { d.design.baseFontPt = 12 } },
      { label: "sidebar-left", change: (d) => { d.design.columns = "sidebar"; d.design.baseFontPt = 11.5 } },
      { label: "sidebar-right", change: (d) => { d.design.columns = "sidebar"; d.design.sidebarPosition = "right"; d.design.baseFontPt = 11.5 } },
      { label: "letter-dates-left", change: (d) => { d.design.page = "Letter"; d.design.datePlacement = "left"; d.design.baseFontPt = 11.5 } },
      { label: "dates-above", change: (d) => { d.design.datePlacement = "above"; d.design.baseFontPt = 11.5 } },
      { label: "long-entry-photo", change: (d) => { longEntry(d); photo(d) } },
      { label: "page-break-before", change: (d) => { d.design.pageBreakBefore = ["education"] } },
      { label: "southern-regional", change: (d) => { d.layout = "southern_european"; d.design.appearance = "regional"; d.design.columns = "sidebar"; d.design.baseFontPt = 11; photo(d) } },
      { label: "europass-regional", change: (d) => { d.layout = "europass_friendly_structured"; d.design.appearance = "regional"; d.design.baseFontPt = 11.5 } },
      { label: "dutch-footer", change: (d) => { d.layout = "dutch_tailored"; d.design.appearance = "regional"; d.design.baseFontPt = 11.5; d.regionalOptions.customFooter = "I consent to the processing of my personal data."; d.regionalOptions.showSignature = true; d.regionalOptions.documentDate = "17 Nov 2026" } },
    ]
    /** Read the proof's pages, print, and require the PDF to page the same way. */
    const checkParity = async (label: string) => {
      const proof = await page.evaluate(() => ({
        pageCount: Number(document.querySelector("[data-cv-page-count]")!.getAttribute("data-cv-page-count")),
        headings: Array.from(document.querySelectorAll<HTMLElement>(".cv-paged-proof .region-section > h2")).map((h2) => h2.textContent ?? ""),
        starts: Array.from(document.querySelectorAll<HTMLElement>(".cv-paged-proof [data-cv-page-start]")).map((element) => ({
          page: Number(element.dataset.cvPageStart),
          // Its heading, not its whole text: CSS can show a date before the title it follows in the DOM.
          text: (element.matches("h2, h3") ? element : element.querySelector("h2, h3") ?? element).textContent ?? "",
        })),
      }))
      const path = join(output, `${label}.pdf`)
      await page.pdf({ path, preferCSSPageSize: true, displayHeaderFooter: false, printBackground: true })
      await page.screenshot({ path: join(output, `${label}.png`), fullPage: false })
      await assertPageParity(path, label, proof)
      return { ...proof, path }
    }

    for (const { label, change } of cases) {
      const draft = structuredClone(base)
      change(draft)
      hub = applyEditorOperations(hub, [{ type: "replace-presets", presets: [draft], activePresetId: draft.id }])
      await page.reload()
      await page.waitForFunction(() => Number(document.querySelector("[data-cv-page-count]")?.getAttribute("data-cv-page-count")) > 0)
      await page.evaluate(() => Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined))))
      await page.waitForTimeout(700)
      const proof = await checkParity(label)
      if (label === "single-10.5pt") await assertPdfText(proof.path, proof.headings)
      console.log(`page parity ok at ${label}: ${proof.pageCount} pages, ${proof.starts.length} breaks`)
    }
    // Design changes made in the panel must re-page the proof without a reload.
    hub = applyEditorOperations(hub, [{ type: "replace-presets", presets: [structuredClone(base)], activePresetId: base.id }])
    await page.reload()
    await page.waitForFunction(() => Number(document.querySelector("[data-cv-page-count]")?.getAttribute("data-cv-page-count")) > 0)
    const breaksBefore = await page.evaluate(() => Array.from(document.querySelectorAll(".cv-paged-proof [data-cv-page-start]")).map((e) => e.textContent?.slice(0, 30)).join("|"))
    await page.getByRole("tab", { name: "Design", exact: true }).click()
    await page.getByLabel("Date alignment").selectOption("above")
    await page.getByLabel("Between entries (mm)").fill("9")
    await page.getByLabel("Between entries (mm)").blur()
    await page.waitForTimeout(900)
    const live = await checkParity("live-design-change")
    const breaksAfter = live.starts.map((start: { text: string }) => start.text).join("|")
    console.log(`page parity ok at live-design-change: ${live.pageCount} pages${breaksAfter !== breaksBefore ? ", breaks moved" : " (breaks did not move)"}`)

    // The public page still saves the ATS copy.
    await page.goto((process.env.CV_CHECK_URL || "http://localhost:3000/cv/edit").replace(/\/cv\/edit$/, "/cv"))
    await page.emulateMedia({ media: "print" })
    const publicPrint = await page.evaluate(() => ({
      ats: Array.from(document.querySelectorAll('[data-cv-output="ats-print"]')).some((element) => getComputedStyle(element).display !== "none"),
      visual: Array.from(document.querySelectorAll(".cv-document--visual")).some((element) => getComputedStyle(element).display !== "none"),
      empty: Boolean(document.querySelector(".proof-empty")),
    }))
    await page.emulateMedia({ media: "screen" })
    if (!publicPrint.empty && (!publicPrint.ats || publicPrint.visual)) throw new Error(`/cv no longer prints the ATS copy: ${JSON.stringify(publicPrint)}`)
    console.log(publicPrint.empty ? "/cv has no visible CV to print; ATS check skipped" : "/cv still prints the ATS copy")

    await page.goto(process.env.CV_CHECK_URL || "http://localhost:3000/cv/edit")
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: join(output, "editor-mobile.png") })
    if (errors.length) throw new Error(errors.join("\n"))
    console.log(JSON.stringify({ output, errors }, null, 2))
  } finally { await browser.close() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
