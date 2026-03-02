"use client"

import { useEffect, useRef, useState } from "react"
import type { StaticImageData } from "next/image"
import { useRouter } from "next/navigation"

import type { CvData, CvLayoutId } from "./cv-types"
import { ClassicLayout } from "./classic-layout"
import { ResumeLayout } from "./resume-layout"

/** Width the browser should use when rendering for print (matches A4 @ 96dpi). */
const PRINT_VIEWPORT_WIDTH = 1240

function swapViewportForPrint(): () => void {
  const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
  const prev = meta?.content ?? "width=device-width, initial-scale=1"
  if (meta) meta.content = `width=${PRINT_VIEWPORT_WIDTH}, initial-scale=1`
  return () => {
    if (meta) meta.content = prev
  }
}


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
  const restoreViewportRef = useRef<(() => void) | null>(null)

  // Handle native OS print (share sheet / Cmd+P) on mobile
  useEffect(() => {
    const beforePrint = () => {
      restoreViewportRef.current = swapViewportForPrint()
    }
    const afterPrint = () => {
      restoreViewportRef.current?.()
      restoreViewportRef.current = null
    }
    window.addEventListener("beforeprint", beforePrint)
    window.addEventListener("afterprint", afterPrint)
    return () => {
      window.removeEventListener("beforeprint", beforePrint)
      window.removeEventListener("afterprint", afterPrint)
    }
  }, [])

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

  /**
   * On mobile, window.print() fires AFTER the browser has already laid out
   * the page at the mobile viewport width.  By swapping the viewport meta
   * to a desktop width and waiting one animation frame before printing, we
   * force the browser to reflow the page in desktop layout first.
   */
  const handlePrint = () => {
    const restore = swapViewportForPrint()
    // rAF × 2 ensures the browser has painted the new layout before print dialog opens
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print()
        // afterprint event restores the meta; as a fallback also restore after a delay
        setTimeout(restore, 3000)
      })
    })
  }

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

      {active.layout === "classic" && <ClassicLayout data={active.data} profilePicture={profilePicture} />}
      {active.layout === "resume" && <ResumeLayout data={active.data} profilePicture={profilePicture} />}
    </>
  )
}
