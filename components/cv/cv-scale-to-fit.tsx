"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export function CvScaleToFit({
  children,
  maxScale = 1,
  page = "A4",
  proof = false,
}: {
  children: ReactNode
  maxScale?: number
  page?: "A4" | "Letter"
  /** Frame the page as a proof: board padding and crop marks (screen only). */
  proof?: boolean
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(maxScale)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateScale = () => {
      const style = getComputedStyle(viewport)
      const availableWidth = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      if (availableWidth <= 0) return
      setScale(Math.min(maxScale, availableWidth / ((page === "Letter" ? 215.9 : 210) / 25.4 * 96)))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [maxScale, page])

  const documentNode = (
    <div
      className="cv-fit-document"
      data-cv-scale={scale.toFixed(4)}
      style={{ zoom: scale, width: page === "Letter" ? "215.9mm" : "210mm" } as React.CSSProperties}
    >
      {children}
    </div>
  )

  return (
    <div ref={viewportRef} className={`cv-fit-viewport ${proof ? "proof-board" : ""}`}>
      <style>{`
        .cv-fit-viewport {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow: hidden;
        }
        .cv-fit-document {
          width: 210mm;
          max-width: none;
          flex: 0 0 auto;
          transform-origin: top center;
        }
        .cv-fit-document > .regional-cv {
          width: 210mm;
          max-width: none;
        }
        @media print {
          .cv-fit-viewport {
            width: auto !important;
            display: block;
            overflow: visible;
          }
          .cv-fit-document {
            width: auto;
            zoom: 1 !important;
          }
        }
      `}</style>
      {proof ? (
        <div className="proof-sheet">
          {documentNode}
          <i className="proof-crop proof-crop--tl" aria-hidden="true" />
          <i className="proof-crop proof-crop--tr" aria-hidden="true" />
          <i className="proof-crop proof-crop--bl" aria-hidden="true" />
          <i className="proof-crop proof-crop--br" aria-hidden="true" />
        </div>
      ) : documentNode}
    </div>
  )
}
