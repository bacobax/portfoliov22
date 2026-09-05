import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { requireContentHub, updateContentHub } from "@/lib/content-hub-db"
import { canonicalCvSeedFromHub, materializeCvPresets } from "@/lib/content-hub"
import { createRegionalPreset } from "@/lib/cv-presets"
import { COUNTRY_LOCALES, CV_COUNTRIES, CV_LOCALES, CV_TEMPLATE_IDS, type CvCountry, type CvLayoutId, type CvLocale } from "@/lib/cv-templates"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"
import { z } from "zod"

const auth = async () => validateSession((await cookies()).get(SESSION_COOKIE_NAME)?.value)
const createSchema = z.object({
  baseRevision: z.number().int().nonnegative(), name: z.string().min(1),
  country: z.enum(CV_COUNTRIES), locale: z.enum(CV_LOCALES),
  layout: z.enum(CV_TEMPLATE_IDS).optional(),
})

export async function GET() {
  if (!(await auth())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const hub = await requireContentHub()
  return NextResponse.json({ success: true, revision: hub.revision, documents: materializeCvPresets(hub).map((cv) => ({ id: cv.id, name: cv.name, visible: cv.visible, published: hub.publishedPresets.some((item) => item.id === cv.id) })) })
}

export async function POST(request: Request) {
  if (!(await auth())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid CV", details: parsed.error.flatten() }, { status: 400 })
  if (!COUNTRY_LOCALES[parsed.data.country].includes(parsed.data.locale)) return NextResponse.json({ success: false, error: `${parsed.data.locale} is not offered for ${parsed.data.country}` }, { status: 400 })
  const hub = await requireContentHub()
  const cv = createRegionalPreset({ name: parsed.data.name, country: parsed.data.country as CvCountry, locale: parsed.data.locale as CvLocale, layout: parsed.data.layout as CvLayoutId | undefined, sourceContent: canonicalCvSeedFromHub(hub) })
  cv.visible = false
  const result = await updateContentHub(parsed.data.baseRevision, [{ type: "replace-presets", presets: [...materializeCvPresets(hub), cv], activePresetId: cv.id }])
  if (!result.success) return NextResponse.json({ success: false, code: "REVISION_CONFLICT", revision: result.latest.revision }, { status: 409 })
  return NextResponse.json({ success: true, revision: result.hub.revision, id: cv.id }, { status: 201 })
}
