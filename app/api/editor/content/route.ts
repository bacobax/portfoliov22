import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { editorPatchSchema } from "@/lib/content-hub"
import {
  editorStateFromHub,
  requireContentHub,
  updateContentHub,
} from "@/lib/content-hub-db"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

const authenticate = async () => {
  const cookieStore = await cookies()
  return validateSession(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export async function GET() {
  if (!(await authenticate())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    )
  }
  try {
    const hub = await requireContentHub()
    return NextResponse.json({ success: true, ...editorStateFromHub(hub) })
  } catch (error) {
    if (error instanceof Error && error.message === "CONTENT_HUB_MIGRATION_REQUIRED") {
      return NextResponse.json(
        { success: false, error: "Content hub migration is required" },
        { status: 503 },
      )
    }
    console.error("Failed to load editor content hub", error)
    return NextResponse.json(
      { success: false, error: "Failed to load editor content" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  if (!(await authenticate())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    )
  }

  const payload = await request.json().catch(() => null)
  const parsed = editorPatchSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid editor operation",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  try {
    const result = await updateContentHub(
      parsed.data.baseRevision,
      parsed.data.operations,
    )
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          code: "REVISION_CONFLICT",
          error: "Content changed in another editor",
          ...editorStateFromHub(result.latest),
        },
        { status: 409 },
      )
    }
    return NextResponse.json({
      success: true,
      ...editorStateFromHub(result.hub),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "CONTENT_HUB_MIGRATION_REQUIRED") {
      return NextResponse.json(
        { success: false, error: "Content hub migration is required" },
        { status: 503 },
      )
    }
    console.error("Failed to update editor content hub", error)
    return NextResponse.json(
      { success: false, error: "Failed to save editor content" },
      { status: 500 },
    )
  }
}
