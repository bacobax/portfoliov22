import "dotenv/config"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { cvAgentDocumentSchema } from "../lib/cv-agent-document"

const args = process.argv.slice(2)
const command = args[0]
const positional = args.slice(1).filter((value, index, all) => !value.startsWith("--") && (index === 0 || !all[index - 1]?.startsWith("--")))
const option = (name: string) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined }
const server = option("server")?.replace(/\/$/, "")
const password = option("password") ?? process.env.CV_ADMIN_PASSWORD

const fail = (message: string): never => { throw new Error(message) }
const request = async (path: string, init: RequestInit = {}, cookie?: string) => {
  if (!server) fail("Pass --server https://your-site.example")
  const response = await fetch(`${server}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...init.headers } })
  const body = await response.json().catch(() => null)
  if (!response.ok) fail(`${response.status}: ${body?.error ?? response.statusText}${body?.code === "REVISION_CONFLICT" ? ` (latest revision ${body.revision}; pull and reconcile first)` : ""}`)
  return { response, body }
}
const login = async () => {
  if (!password) fail("Set CV_ADMIN_PASSWORD or pass --password")
  const { response } = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) })
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0]
  return cookie || fail("Login succeeded without a session cookie")
}

async function main() {
  if (command === "validate") {
    const file = positional[0] || fail("Usage: npm run cv -- validate FILE")
    const document = cvAgentDocumentSchema.parse(JSON.parse(await readFile(file, "utf8")))
    console.log(`Valid CV document: ${document.cv.name} (${document.cv.id})`)
    return
  }
  const cookie = await login()
  if (command === "list") {
    const { body } = await request("/api/cv/documents", {}, cookie)
    console.table(body.documents)
  } else if (command === "pull") {
    const id = positional[0] || fail("Usage: npm run cv -- pull ID --server URL [--out FILE]")
    const { body } = await request(`/api/cv/documents/${encodeURIComponent(id)}`, {}, cookie)
    const output = option("out") ?? `.cv-work/${id}.json`
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, `${JSON.stringify({ schemaVersion: body.schemaVersion, baseRevision: body.baseRevision, cv: body.cv }, null, 2)}\n`)
    console.log(`Wrote ${output}`)
  } else if (command === "push") {
    const file = positional[0] || fail("Usage: npm run cv -- push FILE --server URL")
    const raw = JSON.parse(await readFile(file, "utf8"))
    const parsed = cvAgentDocumentSchema.parse(raw)
    const { body } = await request(`/api/cv/documents/${encodeURIComponent(parsed.cv.id)}`, { method: "PUT", body: JSON.stringify(parsed) }, cookie)
    console.log(`Draft saved at revision ${body.revision}: ${server}${body.editorUrl}`)
  } else if (command === "publish") {
    const id = positional[0] || fail("Usage: npm run cv -- publish ID --server URL")
    const { body: document } = await request(`/api/cv/documents/${encodeURIComponent(id)}`, {}, cookie)
    const { body } = await request(`/api/cv/documents/${encodeURIComponent(id)}/publish`, { method: "POST", body: JSON.stringify({ baseRevision: document.baseRevision }) }, cookie)
    console.log(`Published revision ${body.revision}: ${server}${body.publicUrl}`)
  } else if (command === "create") {
    const name = option("name") || fail("Pass --name")
    const country = option("country") || fail("Pass --country")
    const locale = option("locale") || "en"
    const { body: listing } = await request("/api/cv/documents", {}, cookie)
    const { body } = await request("/api/cv/documents", { method: "POST", body: JSON.stringify({ baseRevision: listing.revision, name, country, locale, layout: option("layout") }) }, cookie)
    console.log(`Created unpublished draft ${body.id} at revision ${body.revision}`)
  } else {
    fail("Commands: list, create, pull, validate, push, publish")
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
