import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { uploadProjectDocumentBuffer } from "@/lib/cloudinary"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024
const PDF_MIME_TYPE = "application/pdf"

export const runtime = "nodejs"

const extractUploadErrorMessage = (error: unknown): string => {
  if (!error) {
    return "Unknown upload error"
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "object") {
    const candidate = error as {
      message?: string
      error?: { message?: string }
      http_code?: number
      name?: string
    }

    const parts = [
      candidate.name,
      typeof candidate.http_code === "number" ? `HTTP ${candidate.http_code}` : undefined,
      candidate.message || candidate.error?.message,
    ].filter(Boolean)

    if (parts.length > 0) {
      return parts.join(" - ")
    }
  }

  return String(error)
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const isValid = await validateSession(token)

  if (!isValid) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Missing PDF file" }, { status: 400 })
  }

  if (file.type !== PDF_MIME_TYPE) {
    return NextResponse.json({ success: false, error: "Unsupported file type. Only PDF is allowed." }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: "PDF exceeds 12MB limit" }, { status: 400 })
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const document = await uploadProjectDocumentBuffer(fileBuffer, {
      folder: "portfolio/projects/documents",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    })

    return NextResponse.json({ success: true, document })
  } catch (error) {
    const errorMessage = extractUploadErrorMessage(error)
    console.error("Failed to upload project PDF", error)
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
