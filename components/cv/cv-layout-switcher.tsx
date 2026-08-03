"use client"

import { useEffect, useState } from "react"
import type { StaticImageData } from "next/image"
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
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/session")
        const d = (await res.json()) as { authenticated?: boolean }
        if (d.authenticated) setIsAuthenticated(true)
      } catch {}
    })()
  }, [])

  const active = presets.find((p) => p.id === activeId) ?? presets[0]

  const handlePrint = () => window.print()

  if (!active) {
    return <p style={{ textAlign: "center", color: "#64748b", padding: "48px 0" }}>No visible CV presets.</p>
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__layouts">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActiveId(preset.id)}
              className={`toolbar__layout-btn ${active.id === preset.id ? "toolbar__layout-btn--active" : ""}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="toolbar__button"
            style={{ background: "transparent", color: "#0f172a", borderColor: "#0f172a" }}
          >
            ← HOME
          </button>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => router.push("/cv/edit")}
              className="toolbar__button"
              style={{ background: "#3b82f6", borderColor: "#3b82f6" }}
            >
              EDIT CV
            </button>
          )}
          <button type="button" onClick={handlePrint} className="toolbar__button">
            PRINT / SAVE AS PDF
          </button>
        </div>
      </div>

      <CvScaleToFit>
        <RegionalCvLayout layout={active.layout} data={active.data} profilePicture={profilePicture} />
      </CvScaleToFit>
    </>
  )
}
