"use client"

import { useEffect, useId, useState } from "react"
import { Bold, Check, Italic, Minimize2 } from "lucide-react"

import type { CvDesign } from "@/lib/cv-document"
import type { CvPaginationState } from "./cv-paged-proof"

export const FONT_MIN_PT = 9
export const FONT_MAX_PT = 13
const FONT_STEP_PT = 0.5
/** Below this the toolbar flags the size; it is still allowed. */
const READABLE_MIN_PT = 10

const clampFont = (value: number) => Math.min(FONT_MAX_PT, Math.max(FONT_MIN_PT, Math.round(value * 2) / 2))

/**
 * Docs-style controls over the print view: text size, bold/italic, the page
 * the caret is on, and a page budget with a one-click "shrink to fit".
 */
export function CvDocsToolbar({ design, pagination, onDesign, onMark }: {
  design: CvDesign
  pagination: CvPaginationState
  onDesign: (design: CvDesign) => void
  onMark: (kind: "bold" | "italic") => void
}) {
  const targetId = useId()
  const font = clampFont(design.baseFontPt)
  /** What the proof renders (unrounded), to match against the measured size. */
  const renderedFont = design.baseFontPt
  const target = design.targetPages
  const { pageCount, caretPage, overflowPx, linePx, oversized } = pagination
  const measured = pageCount > 0
  const fits = measured && target !== undefined && pageCount <= target
  const [fitting, setFitting] = useState(false)
  const [fitFailed, setFitFailed] = useState(false)
  const [targetText, setTargetText] = useState(target ? String(target) : "")
  useEffect(() => setTargetText(target ? String(target) : ""), [target])

  const setFont = (value: number) => onDesign({ ...design, baseFontPt: clampFont(value) })

  // Shrink one step per fresh measurement until the CV fits or reaches the minimum.
  useEffect(() => {
    // Wait for a measurement taken at the current size before deciding the next step.
    if (!fitting || !measured || target === undefined || pagination.fontPt !== renderedFont) return
    if (pageCount <= target) { setFitting(false); return }
    if (font <= FONT_MIN_PT) { setFitting(false); setFitFailed(true); return }
    onDesign({ ...design, baseFontPt: clampFont(font - FONT_STEP_PT) })
    // Runs again when the next measurement reports a new page count or size.
  }, [fitting, measured, pageCount, font, target, pagination.fontPt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (fits) setFitFailed(false) }, [fits])

  const overLines = linePx > 0 ? Math.max(1, Math.ceil(overflowPx / linePx)) : 0
  const keepSelection = (event: React.MouseEvent) => event.preventDefault()

  return (
    <div className="cv-docs-toolbar" role="toolbar" aria-label="Document formatting">
      <div className="cv-docs-toolbar__group" role="group" aria-label="Text size">
        <button type="button" className="cv-docs-toolbar__btn" aria-label="Decrease text size" disabled={font <= FONT_MIN_PT}
          onMouseDown={keepSelection} onClick={() => setFont(font - FONT_STEP_PT)}>A−</button>
        <span className="cv-docs-toolbar__value" aria-live="polite">{renderedFont.toFixed(1)} pt</span>
        <button type="button" className="cv-docs-toolbar__btn" aria-label="Increase text size" disabled={font >= FONT_MAX_PT}
          onMouseDown={keepSelection} onClick={() => setFont(font + FONT_STEP_PT)}>A+</button>
      </div>
      <div className="cv-docs-toolbar__group" role="group" aria-label="Text style">
        <button type="button" className="cv-docs-toolbar__btn" aria-label="Bold" title="Bold (⌘/Ctrl+B)" onMouseDown={keepSelection} onClick={() => onMark("bold")}><Bold size={15} /></button>
        <button type="button" className="cv-docs-toolbar__btn" aria-label="Italic" title="Italic (⌘/Ctrl+I)" onMouseDown={keepSelection} onClick={() => onMark("italic")}><Italic size={15} /></button>
      </div>
      <span className="cv-docs-toolbar__pages" aria-live="polite">
        {!measured ? "–" : caretPage ? `Page ${caretPage} of ${pageCount}` : `${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
      </span>
      <div className="cv-docs-toolbar__group cv-docs-toolbar__fit" role="group" aria-label="Page budget">
        <label htmlFor={targetId}>Fit to</label>
        <input id={targetId} className="cv-docs-toolbar__input" type="number" min={1} max={6} inputMode="numeric" placeholder="–" value={targetText}
          onChange={(event) => {
            setTargetText(event.target.value)
            const value = Number(event.target.value)
            if (event.target.value === "") onDesign({ ...design, targetPages: undefined })
            else if (Number.isInteger(value) && value >= 1 && value <= 6) onDesign({ ...design, targetPages: value })
          }}
          onBlur={() => setTargetText(target ? String(target) : "")} />
        <span>{target === 1 ? "page" : "pages"}</span>
        {measured && target !== undefined && (fits
          ? <span className="cv-docs-toolbar__status cv-docs-toolbar__status--ok"><Check size={14} /> Fits</span>
          : <span className="cv-docs-toolbar__status cv-docs-toolbar__status--over">Over by ~{overLines} {overLines === 1 ? "line" : "lines"}</span>)}
        <button type="button" className="cv-docs-toolbar__btn cv-docs-toolbar__btn--text" disabled={!measured || target === undefined || fits || fitting || font <= FONT_MIN_PT}
          onClick={() => { setFitFailed(false); setFitting(true) }}>
          <Minimize2 size={14} /> {fitting ? "Shrinking…" : "Shrink to fit"}
        </button>
      </div>
      {renderedFont < READABLE_MIN_PT && <p className="cv-docs-toolbar__note">Below 10 pt is small for ATS screening and readability.</p>}
      {fitFailed && !fits && <p className="cv-docs-toolbar__note" role="status">Still {pageCount} pages at {FONT_MIN_PT} pt — trim content or spacing.</p>}
      {oversized > 0 && <p className="cv-docs-toolbar__note">{oversized === 1 ? "One block is" : `${oversized} blocks are`} longer than a page and will split when printed (dashed outline).</p>}
    </div>
  )
}
