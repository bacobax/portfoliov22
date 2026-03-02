import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { cvPresetsDocumentSchema } from "@/lib/cv-presets"
import { loadCvPresetsWithFallback, saveCvPresets } from "@/lib/cv-presets-db"
import { loadPortfolioContent } from "@/lib/portfolio-content"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

/** Public GET — returns only visible presets (no auth needed for preview) */
export async function GET() {
  try {
    const portfolio = await loadPortfolioContent()
    const doc = await loadCvPresetsWithFallback(portfolio)
    return NextResponse.json({ success: true, presets: doc.presets })
  } catch (error) {
    console.error("Failed to load CV presets", error)
    return NextResponse.json({ success: false, error: "Failed to load" }, { status: 500 })
  }
}

/** Auth-gated PUT — saves the full presets array */
export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const isValid = await validateSession(token)

  if (!isValid) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
  }

  const parsed = cvPresetsDocumentSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid presets", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    await saveCvPresets(parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save CV presets", error)
    return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 })
  }
}
