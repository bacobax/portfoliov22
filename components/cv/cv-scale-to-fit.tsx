"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export function CvScaleToFit({
  children,
  maxScale = 1,
  page = "A4",
  proof = false,
  exact = false,
}: {
  children: ReactNode
  maxScale?: number
  page?: "A4" | "Letter"
  /** Frame the page as a proof: board padding and crop marks (screen only). */
  proof?: boolean
  /**
   * Scale with a transform instead of `zoom`. `zoom` lays text out again at the
   * scaled size, which drifts from print by a pixel or so per page; a transform
   * keeps the exact print layout, so page breaks measured on it hold in print.
   */
  exact?: boolean
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(maxScale)
  const documentRef = useRef<HTMLDivElement>(null)
  const [documentHeight, setDocumentHeight] = useState(0)

  useEffect(() => {
    const element = documentRef.current
    if (!exact || !element) return
    const update = () => setDocumentHeight(element.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [exact])

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

  const pageWidth = page === "Letter" ? "215.9mm" : "210mm"
  const documentNode = exact ? (
    <div className="cv-fit-frame" style={{ width: `calc(${pageWidth} * ${scale})`, height: documentHeight * scale }}>
      <div
        ref={documentRef}
        className="cv-fit-document cv-fit-document--exact"
        data-cv-scale={scale.toFixed(4)}
        style={{ transform: `scale(${scale})`, width: pageWidth }}
      >
        {children}
      </div>
    </div>
  ) : (
    <div
      className="cv-fit-document"
      data-cv-scale={scale.toFixed(4)}
      style={{ zoom: scale, width: pageWidth } as React.CSSProperties}
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
        .cv-fit-frame { flex: 0 0 auto; }
        .cv-fit-document--exact { transform-origin: top left; }
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
          .cv-fit-frame { width: auto !important; height: auto !important; }
          .cv-fit-document--exact { transform: none !important; }
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
