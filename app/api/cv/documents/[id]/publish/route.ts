import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { requireContentHub, updateContentHub } from "@/lib/content-hub-db"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"
import { z } from "zod"

const schema = z.object({ baseRevision: z.number().int().nonnegative() })
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await validateSession((await cookies()).get(SESSION_COOKIE_NAME)?.value)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid publication request" }, { status: 400 })
  const { id } = await context.params
  const hub = await requireContentHub()
  if (!hub.presets.some((item) => item.id === id)) return NextResponse.json({ success: false, error: "CV not found" }, { status: 404 })
  const result = await updateContentHub(parsed.data.baseRevision, [{ type: "publish-cv", presetId: id }])
  if (!result.success) return NextResponse.json({ success: false, code: "REVISION_CONFLICT", revision: result.latest.revision }, { status: 409 })
  return NextResponse.json({ success: true, revision: result.hub.revision, publicUrl: "/cv" })
}
