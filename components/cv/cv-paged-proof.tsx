"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CvData } from "./cv-types"
import { AtsPrintCvLayout } from "./ats-print-layout"
import { cvDesignSchema } from "@/lib/cv-document"
import { pageOfBlock, paginate, pxPerMm, type MeasuredBlock, type Pagination } from "@/lib/cv-pagination"

export interface CvPaginationState {
  /** 0 while the proof cannot be measured (hidden pane, fonts not ready). */
  pageCount: number
  /** Page holding the caret, or null when the selection is outside the proof. */
  caretPage: number | null
  overflowPx: number
  /** One body line in the same (on-screen) pixels as `overflowPx`. */
  linePx: number
  oversized: number
}

const PAPER_MM = { A4: { width: 210, height: 297 }, Letter: { width: 215.9, height: 279.4 } } as const
const GAP_PX = 16
const CSS_PX_PER_MM = 96 / 25.4

/** Never split on screen or in print; measured as one block. */
const ATOMIC = ".ats-header, .ats-footer, ul.ats-inline-list"
const BLOCK = "h2, h3, p, li"
/** `break-after: avoid` in the print CSS. */
const KEEP_WITH_NEXT = "h2, h3, .ats-entry__subtitle, .ats-entry__date"

function collectBlocks(root: Element): HTMLElement[] {
  const blocks: HTMLElement[] = []
  const visit = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (!(child instanceof HTMLElement) || child.tagName === "STYLE") continue
      if (child.matches(ATOMIC) || child.matches(BLOCK)) blocks.push(child)
      else visit(child)
    }
  }
  visit(root)
  return blocks
}

/**
 * The editor's print view: the exact ATS layout that "Save ATS PDF" prints,
 * shown on Word-style sheets. Page breaks are measured, never re-chunked: the
 * first block of each page gets a padding spacer that pushes it onto its sheet,
 * so React keeps owning every text node and the caret is never disturbed.
 */
export function CvPagedProof({ data, onPagination }: { data: CvData; onPagination: (state: CvPaginationState) => void }) {
  const design = cvDesignSchema.parse(data.design ?? {})
  const paper = PAPER_MM[design.page]
  const marginMm = Math.max(12, design.marginMm)
  const fontPt = Math.min(13, Math.max(9, design.baseFontPt))
  const columnRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const blocksRef = useRef<HTMLElement[]>([])
  const paginationRef = useRef<Pagination | null>(null)
  const metricsRef = useRef({ overflowPx: 0, linePx: 0, oversized: 0 })
  const caretRef = useRef<number | null>(null)
  const onPaginationRef = useRef(onPagination)
  onPaginationRef.current = onPagination

  const report = useCallback((count: number) => {
    onPaginationRef.current({ pageCount: count, caretPage: caretRef.current, ...metricsRef.current })
  }, [])

  const measure = useCallback(() => {
    const column = columnRef.current
    const article = column?.querySelector(".ats-print-cv--screen")
    if (!column || !article) return
    // Clear spacers first so every measurement is of the natural flow.
    for (const element of Array.from(article.querySelectorAll<HTMLElement>("[data-cv-page-start], [data-cv-oversized]"))) {
      element.removeAttribute("data-cv-page-start")
      element.removeAttribute("data-cv-oversized")
      element.style.removeProperty("--cv-spacer")
    }
    const articleRect = article.getBoundingClientRect()
    const visualPxPerMm = pxPerMm(articleRect.width, paper.width - 2 * marginMm)
    if (!visualPxPerMm) {
      paginationRef.current = null
      metricsRef.current = { overflowPx: 0, linePx: 0, oversized: 0 }
      report(0)
      return
    }
    const zoom = visualPxPerMm / CSS_PX_PER_MM
    const elements = collectBlocks(article)
    const blocks: MeasuredBlock[] = elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { top: rect.top - articleRect.top, height: rect.height, keepWithNext: element.matches(KEEP_WITH_NEXT) }
    })
    const pagination = paginate(blocks, {
      pageContentPx: (paper.height - 2 * marginMm) * visualPxPerMm,
      marginPx: marginMm * visualPxPerMm,
      gapPx: GAP_PX * zoom,
    }, design.targetPages)
    for (const { blockIndex, spacerPx } of pagination.breaks) {
      const element = elements[blockIndex]
      element.setAttribute("data-cv-page-start", String(pageOfBlock(pagination, blockIndex)))
      // Spacers are applied in CSS pixels; measurements were in on-screen pixels.
      element.style.setProperty("--cv-spacer", `${spacerPx / zoom}px`)
    }
    for (const index of pagination.oversized) elements[index].setAttribute("data-cv-oversized", "")

    if (process.env.NODE_ENV !== "production" && pagination.breaks[0]) {
      const first = pagination.breaks[0]
      const element = elements[first.blockIndex]
      const contentTop = element.getBoundingClientRect().top - articleRect.top + parseFloat(getComputedStyle(element).paddingTop) * zoom
      const expected = (paper.height * CSS_PX_PER_MM + GAP_PX) * zoom
      if (Math.abs(contentTop - expected) > 1) console.warn(`[cv-paged-proof] page 2 starts ${Math.round(contentTop - expected)}px off its sheet`)
    }

    blocksRef.current = elements
    paginationRef.current = pagination
    metricsRef.current = { overflowPx: pagination.overflowPx, linePx: fontPt * 1.42 * (96 / 72) * zoom, oversized: pagination.oversized.length }
    setPageCount(pagination.pageCount)
    report(pagination.pageCount)
  }, [paper.width, paper.height, marginMm, fontPt, design.targetPages, report])

  useEffect(() => {
    const column = columnRef.current
    if (!column) return
    let frame = 0
    // Clear, measure and apply in one frame, so the flow never paints unspaced.
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    schedule()
    let width = column.getBoundingClientRect().width
    const resize = new ResizeObserver(() => {
      // Spacers change the height; only a width change can change the wrapping.
      const next = column.getBoundingClientRect().width
      if (Math.abs(next - width) > 0.5) { width = next; schedule() }
    })
    resize.observe(column)
    const mutations = new MutationObserver(schedule)
    mutations.observe(column, { childList: true, subtree: true, characterData: true })
    void document.fonts?.ready.then(schedule)
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect() }
  }, [measure])

  useEffect(() => {
    const onSelection = () => {
      const anchor = window.getSelection()?.anchorNode ?? null
      const pagination = paginationRef.current
      let page: number | null = null
      if (anchor && pagination && columnRef.current?.contains(anchor)) {
        const index = blocksRef.current.findIndex((block) => block.contains(anchor))
        page = index >= 0 ? pageOfBlock(pagination, index) : null
      }
      if (page !== caretRef.current) { caretRef.current = page; report(pagination?.pageCount ?? 0) }
    }
    document.addEventListener("selectionchange", onSelection)
    return () => document.removeEventListener("selectionchange", onSelection)
  }, [report])

  const sheets = Math.max(1, pageCount)
  return (
    <div
      className="cv-paged-proof"
      data-cv-page-count={pageCount}
      style={{ width: `${paper.width}mm`, minHeight: `calc(${sheets} * ${paper.height}mm + ${(sheets - 1) * GAP_PX}px)` }}
    >
      <style>{`
        .cv-paged-proof { position: relative; margin: 0 auto; }
        .cv-paged-proof__sheet { position: absolute; left: 0; right: 0; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.18), 0 6px 18px rgba(0,0,0,.08); }
        .cv-paged-proof__column { position: relative; }
        /* The sheets are the paper; the document itself must not paint over the gaps. */
        .cv-paged-proof .ats-print-cv--screen { background: transparent !important; }
        .cv-paged-proof [data-cv-oversized] { outline: 1px dashed #b8321b; outline-offset: 2px; }
        .cv-paged-proof .cv-editable { border-radius: 2px; outline: none; }
        .cv-paged-proof .cv-editable:hover { background: rgba(15, 108, 114, .06); }
        .cv-paged-proof .cv-editable:focus { background: rgba(15, 108, 114, .08); box-shadow: 0 0 0 2px rgba(15, 108, 114, .35); }
        .cv-paged-proof .cv-editable:empty::before { content: attr(data-placeholder); color: #8a9199; }
        @media print { .cv-paged-proof__sheet { display: none; } }
      `}</style>
      {Array.from({ length: sheets }, (_, index) => (
        <div key={index} className="cv-paged-proof__sheet" aria-hidden="true"
          style={{ top: `calc(${index} * (${paper.height}mm + ${GAP_PX}px))`, height: `${paper.height}mm` }} />
      ))}
      <div ref={columnRef} className="cv-paged-proof__column" style={{ padding: `${marginMm}mm` }}>
        <AtsPrintCvLayout data={data} screen />
      </div>
    </div>
  )
}
