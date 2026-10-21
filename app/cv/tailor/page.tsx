import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import CvCursorVisibility from "@/components/cv-cursor-visibility"
import { CvTailorBuilder, type TailorSource } from "@/components/cv/cv-tailor-builder"
import { materializeCvPresets } from "@/lib/content-hub"
import { loadContentHub } from "@/lib/content-hub-db"
import { loadCvPresetsWithFallback } from "@/lib/cv-presets-db"
import { createTailoredCv } from "@/lib/cv-tailor"
import { loadTailoredCv } from "@/lib/cv-tailor-db"
import { loadPortfolioContent } from "@/lib/portfolio-content"
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/session"
import profilePicture from "@/app/prof_pic.jpeg"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "CV builder",
  robots: { index: false, follow: false },
}

export default async function CvTailorPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!(await validateSession(token))) redirect("/")

  // Owner view: every CV draft, not only the published ones.
  const hub = await loadContentHub()
  const portfolio = hub?.portfolio ?? await loadPortfolioContent()
  const presets = hub
    ? materializeCvPresets(hub)
    : (await loadCvPresetsWithFallback(portfolio)).presets
  const sources: TailorSource[] = presets.map((preset) => ({ id: preset.id, name: preset.name, seed: createTailoredCv(preset, portfolio.contactData.links) }))
  const draft = await loadTailoredCv().catch((error) => {
    console.error("Failed to load tailored CV", error)
    return null
  })

  // Drafts saved before header links existed pick them up from the CV they were based on.
  const seed = sources.find((source) => source.id === draft?.sourcePresetId) ?? sources[0]
  const initialDraft = draft && !draft.data.contactLinks && seed
    ? { ...draft, data: { ...draft.data, contactLinks: seed.seed.data.contactLinks } }
    : draft

  return (
    <>
      <CvCursorVisibility />
      <CvTailorBuilder initialDraft={initialDraft} sources={sources} profilePicture={profilePicture} />
    </>
  )
}
