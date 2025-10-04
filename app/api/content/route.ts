import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { cloneDefaultContent, portfolioContentSchema } from "@/lib/default-content"
import { getDb } from "@/lib/mongodb"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

const COLLECTION_NAME = "portfolio_content"
const DOCUMENT_ID = "portfolio_content"

export async function GET() {
  try {
    const db = await getDb()
    const document = await db
      .collection(COLLECTION_NAME)
      .findOne<{ _id: string } & Record<string, unknown>>({ _id: DOCUMENT_ID })

    if (!document) {
      return NextResponse.json({ content: cloneDefaultContent() })
    }

    const { _id, ...rest } = document
    const parsed = portfolioContentSchema.safeParse(rest)

    if (!parsed.success) {
      return NextResponse.json({ content: cloneDefaultContent() })
    }

    return NextResponse.json({ content: parsed.data })
  } catch (error) {
    console.error("Failed to load portfolio content", error)
    return NextResponse.json({ content: cloneDefaultContent() })
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

  if (!payload) {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
  }

  const parsed = portfolioContentSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid content" }, { status: 400 })
  }

  try {
    const db = await getDb()
    await db.collection(COLLECTION_NAME).updateOne(
      { _id: DOCUMENT_ID },
      { $set: parsed.data, $setOnInsert: { _id: DOCUMENT_ID } },
      { upsert: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to persist portfolio content", error)
    return NextResponse.json({ success: false, error: "Failed to save content" }, { status: 500 })
  }
}
