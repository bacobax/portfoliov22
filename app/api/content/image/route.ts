import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { uploadProjectImage } from "@/lib/cloudinary"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"])

export const runtime = "nodejs"

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
    return NextResponse.json({ success: false, error: "Missing image file" }, { status: 400 })
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ success: false, error: "Unsupported image type" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: "Image exceeds 8MB limit" }, { status: 400 })
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const base64 = fileBuffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`
    const image = await uploadProjectImage(dataUri, {
      folder: "portfolio/projects",
    })

    return NextResponse.json({ success: true, image })
  } catch (error) {
    console.error("Failed to upload project image", error)
    return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 })
  }
}
