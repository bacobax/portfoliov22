import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { parseTailoredCv } from "@/lib/cv-tailor"
import { deleteTailoredCv, loadTailoredCv, saveTailoredCv } from "@/lib/cv-tailor-db"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

export const dynamic = "force-dynamic"

const auth = async () => validateSession((await cookies()).get(SESSION_COOKIE_NAME)?.value)
const unauthorized = () => NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
const noStore = { headers: { "Cache-Control": "no-store" } }

export async function GET() {
  if (!(await auth())) return unauthorized()
  return NextResponse.json({ success: true, draft: await loadTailoredCv() }, noStore)
}

export async function PUT(request: Request) {
  if (!(await auth())) return unauthorized()
  const draft = parseTailoredCv(await request.json().catch(() => null))
  if (!draft) return NextResponse.json({ success: false, error: "Invalid tailored CV" }, { status: 400 })
  try {
    const updatedAt = await saveTailoredCv(draft)
    return NextResponse.json({ success: true, updatedAt }, noStore)
  } catch (error) {
    console.error("Failed to save tailored CV", error)
    return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 })
  }
}

export async function DELETE() {
  if (!(await auth())) return unauthorized()
  await deleteTailoredCv()
  return NextResponse.json({ success: true }, noStore)
}
