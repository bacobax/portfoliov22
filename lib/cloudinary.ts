import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary"
import type { ProjectDocument, ProjectImage } from "@/lib/default-content"

let cloudinaryConfigured = false

const ensureCloudinaryConfigured = () => {
  if (cloudinaryConfigured) {
    return
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not fully configured")
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  cloudinaryConfigured = true
}

const normalizeProjectImage = (response: {
  asset_id?: string
  public_id?: string
  version?: number
  version_id?: string
  format?: string
  resource_type?: string
  created_at?: string
  width?: number
  height?: number
  bytes?: number
  original_filename?: string
  original_extension?: string
  display_name?: string
  secure_url?: string
  url?: string
}): ProjectImage => {
  const publicId = response.public_id ?? ""
  if (!publicId) {
    throw new Error("Cloudinary response is missing public_id")
  }

  const version = typeof response.version === "number" ? response.version : 0
  const format = response.format ?? "jpg"
  const resourceType = response.resource_type === "image" ? "image" : "image"
  const secureUrl =
    response.secure_url ??
    response.url?.replace(/^http:\/\//, "https://") ??
    (version > 0
      ? buildCloudinaryUrl({
          publicId,
          version,
          format,
          resourceType,
        })
      : undefined)

  return {
    assetId: response.asset_id ?? publicId,
    publicId,
    version,
    versionId: response.version_id,
    format,
    resourceType,
    createdAt: response.created_at ?? new Date().toISOString(),
    width: typeof response.width === "number" ? response.width : 0,
    height: typeof response.height === "number" ? response.height : 0,
    bytes: typeof response.bytes === "number" ? response.bytes : 0,
    originalFilename: response.original_filename,
    originalExtension: response.original_extension,
    displayName: response.display_name,
    secureUrl,
    url: response.url,
  }
}

const buildCloudinaryUrl = (image: {
  publicId: string
  version: number
  format: string
  resourceType: "image"
}) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME is not set")
  }

  return `https://res.cloudinary.com/${cloudName}/${image.resourceType}/upload/v${image.version}/${image.publicId}.${image.format}`
}

const buildCloudinaryAssetUrl = (asset: {
  publicId: string
  version: number
  format: string
  resourceType: "image" | "raw"
}) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME is not set")
  }

  return `https://res.cloudinary.com/${cloudName}/${asset.resourceType}/upload/v${asset.version}/${asset.publicId}.${asset.format}`
}

const normalizeProjectDocument = (response: {
  asset_id?: string
  public_id?: string
  version?: number
  version_id?: string
  format?: string
  resource_type?: string
  created_at?: string
  bytes?: number
  original_filename?: string
  original_extension?: string
  display_name?: string
  secure_url?: string
  url?: string
}): ProjectDocument => {
  const publicId = response.public_id ?? ""

  if (!publicId) {
    throw new Error("Cloudinary response is missing public_id")
  }

  const version = typeof response.version === "number" ? response.version : 0
  const format = response.format ?? "pdf"
  const resourceType: "image" | "raw" = response.resource_type === "raw" ? "raw" : "image"
  const secureUrl =
    response.secure_url ??
    response.url?.replace(/^http:\/\//, "https://") ??
    (version > 0
      ? buildCloudinaryAssetUrl({
          publicId,
          version,
          format,
          resourceType,
        })
      : undefined)

  return {
    assetId: response.asset_id ?? publicId,
    publicId,
    version,
    versionId: response.version_id,
    format,
    resourceType,
    createdAt: response.created_at ?? new Date().toISOString(),
    bytes: typeof response.bytes === "number" ? response.bytes : 0,
    originalFilename: response.original_filename,
    originalExtension: response.original_extension,
    displayName: response.display_name,
    secureUrl,
    url: response.url,
  }
}

const isNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { http_code?: number; message?: string }
  if (candidate.http_code === 404) {
    return true
  }

  return candidate.message?.toLowerCase().includes("not found") ?? false
}

export async function uploadProjectImage(
  file: string,
  options: UploadApiOptions = {},
): Promise<ProjectImage> {
  ensureCloudinaryConfigured()

  const response: UploadApiResponse = await cloudinary.uploader.upload(file, {
    resource_type: "image",
    ...options,
  })

  return normalizeProjectImage(response)
}

export async function uploadProjectImageBuffer(
  fileBuffer: Buffer,
  options: UploadApiOptions = {},
): Promise<ProjectImage> {
  ensureCloudinaryConfigured()

  return new Promise<ProjectImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        if (!result) {
          reject(new Error("Cloudinary upload failed: empty response"))
          return
        }

        try {
          resolve(normalizeProjectImage(result))
        } catch (normalizationError) {
          reject(normalizationError)
        }
      },
    )

    stream.on("error", reject)
    stream.end(fileBuffer)
  })
}

export async function uploadProjectDocumentBuffer(
  fileBuffer: Buffer,
  options: UploadApiOptions = {},
): Promise<ProjectDocument> {
  ensureCloudinaryConfigured()

  return new Promise<ProjectDocument>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        allowed_formats: ["pdf"],
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        if (!result) {
          reject(new Error("Cloudinary upload failed: empty response"))
          return
        }

        try {
          resolve(normalizeProjectDocument(result))
        } catch (normalizationError) {
          reject(normalizationError)
        }
      },
    )

    stream.on("error", reject)
    stream.end(fileBuffer)
  })
}

export async function loadProjectImage(image: ProjectImage): Promise<ProjectImage | undefined> {
  try {
    ensureCloudinaryConfigured()

    const response = (await cloudinary.api.resource(image.publicId, {
      resource_type: image.resourceType,
    })) as {
      asset_id: string
      public_id: string
      version: number
      version_id?: string
      format: string
      resource_type: string
      created_at: string
      width: number
      height: number
      bytes: number
      original_filename?: string
      original_extension?: string
      display_name?: string
      secure_url?: string
      url?: string
    }

    return normalizeProjectImage(response)
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined
    }

    console.error("Failed to load project image from Cloudinary", error)

    try {
      return {
        ...image,
        secureUrl: image.secureUrl || buildCloudinaryUrl(image),
      }
    } catch {
      return image
    }
  }
}

export async function loadProjectDocument(
  document: ProjectDocument,
): Promise<ProjectDocument | undefined> {
  try {
    ensureCloudinaryConfigured()

    const response = (await cloudinary.api.resource(document.publicId, {
      resource_type: document.resourceType,
    })) as {
      asset_id?: string
      public_id?: string
      version?: number
      version_id?: string
      format?: string
      resource_type?: string
      created_at?: string
      bytes?: number
      original_filename?: string
      original_extension?: string
      display_name?: string
      secure_url?: string
      url?: string
    }

    return normalizeProjectDocument(response)
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined
    }

    console.error("Failed to load project document from Cloudinary", error)

    try {
      return {
        ...document,
        secureUrl:
          document.secureUrl ||
          buildCloudinaryAssetUrl({
            publicId: document.publicId,
            version: document.version,
            format: document.format,
            resourceType: document.resourceType,
          }),
      }
    } catch {
      return document
    }
  }
}
