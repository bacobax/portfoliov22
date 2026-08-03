"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

const A4_WIDTH_PX = (210 / 25.4) * 96

export function CvScaleToFit({
  children,
  maxScale = 1,
}: {
  children: ReactNode
  maxScale?: number
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(maxScale)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateScale = () => {
      const availableWidth = viewport.clientWidth
      if (availableWidth <= 0) return
      setScale(Math.min(maxScale, availableWidth / A4_WIDTH_PX))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [maxScale])

  return (
    <div ref={viewportRef} className="cv-fit-viewport">
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
            width: auto;
            display: block;
            overflow: visible;
          }
          .cv-fit-document {
            width: auto;
            zoom: 1 !important;
          }
        }
      `}</style>
      <div
        className="cv-fit-document"
        data-cv-scale={scale.toFixed(4)}
        style={{ zoom: scale } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}
