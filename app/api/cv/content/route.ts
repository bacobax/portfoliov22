import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { cvContentSchema } from "@/lib/cv-content"
import { loadCvContentWithFallback, saveCvContent } from "@/lib/cv-content-db"
import { loadPortfolioContent } from "@/lib/portfolio-content"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const isValid = await validateSession(token)

  if (!isValid) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const portfolio = await loadPortfolioContent()
    const content = await loadCvContentWithFallback(portfolio)
    return NextResponse.json({ success: true, content })
  } catch (error) {
    console.error("Failed to load CV content", error)
    return NextResponse.json({ success: false, error: "Failed to load CV content" }, { status: 500 })
  }
}

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

  const parsed = cvContentSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid CV content", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    await saveCvContent(parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save CV content", error)
    return NextResponse.json({ success: false, error: "Failed to save CV content" }, { status: 500 })
  }
}
