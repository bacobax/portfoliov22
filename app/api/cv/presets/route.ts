import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { loadCvPresetsWithFallback } from "@/lib/cv-presets-db"
import { loadPortfolioContent } from "@/lib/portfolio-content"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"
import { loadContentHub } from "@/lib/content-hub-db"

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
export async function PUT() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const isValid = await validateSession(token)

  if (!isValid) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const hub = await loadContentHub().catch(() => null)
  if (!hub) {
    return NextResponse.json(
      { success: false, error: "Content hub migration is required" },
      { status: 503 },
    )
  }
  return NextResponse.json(
    { success: false, error: "Snapshot writes are retired; use /api/editor/content" },
    { status: 405 },
  )
}
