"use client"

import { useEffect, useState } from "react"
import type { StaticImageData } from "next/image"
import { ArrowLeft, PencilLine } from "lucide-react"
import { CvPrintButton } from "./cv-print-button"
import { useRouter } from "next/navigation"

import type { CvData, CvLayoutId } from "./cv-types"
import { RegionalCvLayout } from "./regional-layout"
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
  const router = useRouter()

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
    return <p style={{ textAlign: "center", color: "#64748b", padding: "48px 0" }}>No visible CV presets.</p>
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__intro"><span>Curriculum vitae</span><strong>{active.name}</strong></div>
        <div className="toolbar__layouts" role="group" aria-label="Choose CV version">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active.id === preset.id}
              onClick={() => setActiveId(preset.id)}
              className={`toolbar__layout-btn ${active.id === preset.id ? "toolbar__layout-btn--active" : ""}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="toolbar__actions">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="toolbar__button"
            style={{ background: "transparent", color: "#0f172a", borderColor: "#0f172a" }}
          >
            <ArrowLeft size={16} /> Home
          </button>
          {isSessionLoading ? (
            <span className="toolbar__auth-skeleton app-skeleton-block" role="status" aria-label="Checking editor session" />
          ) : isAuthenticated && (
            <button
              type="button"
              onClick={() => router.push("/cv/edit")}
              className="toolbar__button"
              style={{ background: "#3b82f6", borderColor: "#3b82f6" }}
            >
              <PencilLine size={16} /> Edit CV
            </button>
          )}
          <CvPrintButton />
        </div>
      </div>

      <CvScaleToFit page={active.data.design?.page}>
        <RegionalCvLayout layout={active.layout} data={active.data} profilePicture={profilePicture} />
      </CvScaleToFit>
    </>
  )
}
