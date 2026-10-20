import { mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"

const PLAYWRIGHT_PATH =
  "/Users/francescobassignana/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const CV_NAME = "Full Stack and GenAI EN"

async function main() {
  const output = resolve(
    process.argv[2] ?? "output/pdf/francesco-bassignana-fullstack-genai-cv.pdf",
  )
  const url = process.env.CV_EXPORT_URL ?? "http://localhost:3001/cv"
  await mkdir(dirname(output), { recursive: true })

  const require = createRequire(import.meta.url)
  const { chromium } = require(PLAYWRIGHT_PATH)
  const browser = await chromium.launch({
    executablePath: process.env.CV_CHROME_PATH ?? CHROME_PATH,
    headless: true,
  })

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
    const errors: string[] = []
    page.on("pageerror", (error: Error) => errors.push(error.message))

    await page.goto(url, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: CV_NAME, exact: true }).click()
    await page.getByRole("heading", {
      name: "FRANCESCO BASSIGNANA",
      exact: true,
    }).waitFor()
    await page
      .getByText("FULL STACK & GENERATIVE AI ENGINEER", { exact: true })
      .first()
      .waitFor()
    await page.locator('[data-cv-output="ats-print"]').waitFor({ state: "attached" })
    await page.emulateMedia({ media: "print" })
    await page.pdf({
      path: output,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      printBackground: true,
    })

    if (errors.length > 0) throw new Error(errors.join("\n"))
    console.log(output)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
