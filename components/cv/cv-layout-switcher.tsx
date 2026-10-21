"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { StaticImageData } from "next/image"
import { ArrowLeft, PencilLine, Wand2 } from "lucide-react"
import { CvPrintButton } from "./cv-print-button"

import type { CvData, CvLayoutId } from "./cv-types"
import { CvDocumentOutput } from "./cv-document-output"
import { CvScaleToFit } from "./cv-scale-to-fit"


export interface PresetView {
  id: string
  name: string
  layout: CvLayoutId
  data: CvData
}

export function CvLayoutSwitcher({
  presets,
  profilePicture,
}: {
  presets: PresetView[]
  profilePicture: StaticImageData
}) {
  const [activeId, setActiveId] = useState<string>(presets[0]?.id ?? "")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSessionLoading, setIsSessionLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/session")
        const d = (await res.json()) as { authenticated?: boolean }
        if (d.authenticated) setIsAuthenticated(true)
      } catch {
      } finally {
        setIsSessionLoading(false)
      }
    })()
  }, [])

  const active = presets.find((p) => p.id === activeId) ?? presets[0]


  if (!active) {
    return (
      <div className="proof-empty">
        <p>No CV has been published yet.</p>
        <Link href="/" className="proof-btn"><ArrowLeft size={16} /> Back to the portfolio</Link>
      </div>
    )
  }

  const page = active.data.design?.page ?? "A4"

  return (
    <>
      <header className="toolbar proof-masthead">
        <div className="proof-masthead__identity">
          <Link href="/" className="proof-masthead__back"><ArrowLeft size={15} /> Portfolio</Link>
          <h1 className="proof-masthead__name">{active.data.name || "Curriculum vitae"}</h1>
          <p className="proof-masthead__meta">Curriculum vitae · {page}</p>
        </div>

        {presets.length > 1 && (
          <div className="proof-versions" role="group" aria-label="Choose CV version">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active.id === preset.id}
                onClick={() => setActiveId(preset.id)}
                className="proof-versions__tab"
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}

        <div className="proof-masthead__actions">
          {isSessionLoading ? (
            <span className="proof-masthead__auth-skeleton app-skeleton-block" role="status" aria-label="Checking editor session" />
          ) : isAuthenticated && (
            <>
              <Link href="/cv/tailor" className="proof-btn proof-btn--quiet"><Wand2 size={16} /> Tailor</Link>
              <Link href="/cv/edit" className="proof-btn proof-btn--quiet"><PencilLine size={16} /> Edit</Link>
            </>
          )}
          <CvPrintButton className="proof-btn proof-btn--primary" />
        </div>
      </header>

      <CvScaleToFit page={active.data.design?.page} proof>
        <CvDocumentOutput layout={active.layout} data={active.data} profilePicture={profilePicture} />
      </CvScaleToFit>
    </>
  )
}
