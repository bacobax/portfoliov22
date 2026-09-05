import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { CV_DOCUMENT_SCHEMA_VERSION } from "@/lib/cv-document"
import { cvAgentDocumentSchema } from "@/lib/cv-agent-document"
import { materializeCvPresets } from "@/lib/content-hub"
import { requireContentHub, updateContentHub } from "@/lib/content-hub-db"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

const auth = async () => validateSession((await cookies()).get(SESSION_COOKIE_NAME)?.value)

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await auth())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params
  const hub = await requireContentHub()
  const cv = materializeCvPresets(hub).find((item) => item.id === id)
  if (!cv) return NextResponse.json({ success: false, error: "CV not found" }, { status: 404 })
  return NextResponse.json({ schemaVersion: CV_DOCUMENT_SCHEMA_VERSION, baseRevision: hub.revision, cv, published: hub.publishedPresets.some((item) => item.id === id) })
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await auth())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params
  const parsed = cvAgentDocumentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || parsed.data.cv.id !== id) return NextResponse.json({ success: false, error: "Invalid CV document", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 })
  const hub = await requireContentHub()
  if (!hub.presets.some((item) => item.id === id)) return NextResponse.json({ success: false, error: "CV not found" }, { status: 404 })
  const drafts = materializeCvPresets(hub).map((item) => item.id === id ? parsed.data.cv : item)
  const result = await updateContentHub(parsed.data.baseRevision, [{ type: "replace-presets", presets: drafts, activePresetId: id }])
  if (!result.success) return NextResponse.json({ success: false, code: "REVISION_CONFLICT", error: "Content changed; pull and reconcile before retrying", revision: result.latest.revision }, { status: 409 })
  return NextResponse.json({ success: true, revision: result.hub.revision, editorUrl: `/cv/edit?cv=${encodeURIComponent(id)}` })
}
