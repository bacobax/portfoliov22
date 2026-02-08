import { NextResponse } from "next/server"

import { getProjectDocumentSignedDownloadUrl } from "@/lib/cloudinary"
import type { ProjectDocument } from "@/lib/default-content"

export const runtime = "nodejs"

const isValidParam = (value: string | null): value is string =>
  typeof value === "string" && value.trim().length > 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const publicId = searchParams.get("publicId")
  const format = searchParams.get("format")
  const resourceTypeParam = searchParams.get("resourceType")

  if (!isValidParam(publicId)) {
    return NextResponse.json({ success: false, error: "Missing publicId" }, { status: 400 })
  }

  const resourceType: "image" | "raw" = resourceTypeParam === "raw" ? "raw" : "image"

  if (!isValidParam(format)) {
    return NextResponse.json({ success: false, error: "Missing document format" }, { status: 400 })
  }

  try {
    const document: ProjectDocument = {
      assetId: publicId,
      publicId,
      version: 1,
      format,
      resourceType,
      createdAt: new Date().toISOString(),
      bytes: 0,
    }
    const signedDownloadUrl = getProjectDocumentSignedDownloadUrl(document)
    return NextResponse.redirect(signedDownloadUrl, { status: 302 })
  } catch (error) {
    console.error("Failed to generate signed PDF URL", error)
    return NextResponse.json({ success: false, error: "Failed to open PDF" }, { status: 500 })
  }
}
