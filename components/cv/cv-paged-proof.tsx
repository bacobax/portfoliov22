"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { StaticImageData } from "next/image"

import type { CvData, CvLayoutId } from "./cv-types"
import { RegionalCvLayout } from "./regional-layout"
import { cvDesignSchema } from "@/lib/cv-document"
import { paginate, pxPerMm, type MeasuredBlock } from "@/lib/cv-pagination"

export interface CvPaginationState {
  /** 0 while the proof cannot be measured (hidden pane, fonts not ready). */
  pageCount: number
  /** Page holding the caret, or null when the selection is outside the proof. */
  caretPage: number | null
  overflowPx: number
  /** One body line in the same (on-screen) pixels as `overflowPx`. */
  linePx: number
  oversized: number
  /** Body size these numbers were measured at, so callers can wait for a fresh result. */
  fontPt: number
}

export const PAPER_MM = { A4: { width: 210, height: 297 }, Letter: { width: 215.9, height: 279.4 } } as const
const GAP_PX = 16
const CSS_PX_PER_MM = 96 / 25.4
/** Sub-pixel tolerance: Chrome still fits a block that ends a fraction of a pixel past the page. */
const HEADROOM_PX = -0.5

/** Never split on screen or in print (`break-inside: avoid` in the print CSS); measured as one block. */
const ATOMIC = [
  ".region-entry--short", ".region-entry__heading", ".region-skill-group", ".region-tags",
  ".region-list--inline > ul", ".region-personal", ".region-header",
].join(", ")
const BLOCK = "h2, h3, p, li"
/** `break-after: avoid` in the print CSS. */
const KEEP_WITH_NEXT = ".region-section > h2, .region-entry__heading"
/** `break-before: avoid`: the block before one of these stays with it. */
const KEEP_WITH_PREVIOUS = ".region-technologies, .region-entry-link"

function collectBlocks(root: Element): HTMLElement[] {
  const blocks: HTMLElement[] = []
  const visit = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (!(child instanceof HTMLElement) || child.tagName === "STYLE" || child.classList.contains("cv-edit-controls")) continue
      if (getComputedStyle(child).display === "none") continue
      if (child.matches(ATOMIC) || child.matches(BLOCK)) blocks.push(child)
      else visit(child)
    }
  }
  visit(root)
  return blocks
}

/**
 * A heading in a grid row (Europass puts it beside its section) is stretched to
 * the row; only its own lines need to fit, so measure to the end of its text.
 */
function blockHeight(element: HTMLElement): number {
  const rect = element.getBoundingClientRect()
  if (element.tagName !== "H2") return rect.height
  const range = document.createRange()
  range.selectNodeContents(element)
  const text = range.getBoundingClientRect()
  if (!text.height) return rect.height
  const style = getComputedStyle(element)
  const scale = rect.width / (element.offsetWidth || rect.width)
  const below = ((parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0)) * scale
  return Math.min(rect.height, text.bottom - rect.top + below)
}

/** The bottom margin that ends with `block`: its own, collapsed with ancestors that close at its edge. */
function trailingMargin(block: HTMLElement, article: Element): number {
  const bottom = block.getBoundingClientRect().bottom
  let margin = 0
  for (let element: HTMLElement | null = block; element && element !== article; element = element.parentElement) {
    if (Math.abs(element.getBoundingClientRect().bottom - bottom) > 0.5) break
    margin = Math.max(margin, parseFloat(getComputedStyle(element).marginBottom) || 0)
  }
  return margin
}

/**
 * The spacer goes on the outermost box that starts where the block starts, so
 * whatever shares its line (a date in a grid beside it, a section rule) moves with it.
 */
function spacerHost(block: HTMLElement, column: Element): HTMLElement {
  const top = block.getBoundingClientRect().top
  let host = block
  for (let parent = block.parentElement; parent && parent !== column; parent = parent.parentElement) {
    if (Math.abs(parent.getBoundingClientRect().top - top) > 0.5) break
    host = parent
  }
  return host
}

/**
 * The editor's single proof: the design layout exactly as it prints, on
 * Word-style sheets with a gap between pages. Page breaks are measured, never
 * re-chunked: the first block of each page gets a padding spacer that pushes it
 * onto its sheet, so React keeps owning every text node and the caret is never
 * disturbed. Sidebar and main column are paged independently, as in print.
 * This copy never prints; `CvPrintCopy` (same layout, no spacers) does.
 */
export function CvPagedProof({ layout, data, profilePicture, onPagination }: {
  layout: CvLayoutId
  data: CvData
  profilePicture: StaticImageData
  onPagination: (state: CvPaginationState) => void
}) {
  const design = cvDesignSchema.parse(data.design ?? {})
  const paper = PAPER_MM[design.page]
  const marginMm = design.marginMm
  const fontPt = design.baseFontPt
  const lineHeight = design.lineHeight
  const designKey = JSON.stringify(design)
  const rootRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const blockPagesRef = useRef<Map<HTMLElement, number>>(new Map())
  const pageCountRef = useRef(0)
  const metricsRef = useRef({ overflowPx: 0, linePx: 0, oversized: 0, fontPt })
  const caretRef = useRef<number | null>(null)
  const onPaginationRef = useRef(onPagination)
  onPaginationRef.current = onPagination

  const report = useCallback(() => {
    onPaginationRef.current({ pageCount: pageCountRef.current, caretPage: caretRef.current, ...metricsRef.current })
  }, [])

  const measure = useCallback(() => {
    const root = rootRef.current
    const article = root?.querySelector<HTMLElement>(".regional-cv")
    if (!root || !article) return
    // Clear spacers first so every measurement is of the natural flow.
    for (const element of Array.from(article.querySelectorAll<HTMLElement>("[data-cv-page-start], [data-cv-oversized]"))) {
      element.removeAttribute("data-cv-page-start")
      element.removeAttribute("data-cv-oversized")
      element.style.removeProperty("--cv-spacer")
    }
    const articleRect = article.getBoundingClientRect()
    const visualPxPerMm = pxPerMm(articleRect.width, paper.width)
    if (!visualPxPerMm) {
      pageCountRef.current = 0
      metricsRef.current = { overflowPx: 0, linePx: 0, oversized: 0, fontPt }
      report()
      return
    }
    const zoom = visualPxPerMm / CSS_PX_PER_MM
    const marginPx = marginMm * visualPxPerMm
    const pageContentPx = (paper.height - 2 * marginMm) * visualPxPerMm
    const sheetPx = paper.height * visualPxPerMm
    const gapPx = GAP_PX * zoom
    const pageLayout = { pageContentPx, marginPx, gapPx, originPx: marginPx, headroomPx: HEADROOM_PX * zoom }
    const relTop = (element: Element) => element.getBoundingClientRect().top - articleRect.top

    const blockPages = new Map<HTMLElement, number>()
    const spacers: { host: HTMLElement; spacerPx: number; page: number }[] = []
    const oversized: HTMLElement[] = []
    let pages = 1
    let overflowPx = 0
    // Each column flows on its own across the same sheets, exactly as print fragments a grid row.
    const columns = Array.from(article.querySelectorAll<HTMLElement>(".region-sidebar, .region-main"))
    for (const column of columns) {
      const elements = collectBlocks(column)
      if (elements.length === 0) continue
      const blocks: MeasuredBlock[] = elements.map((element, index) => {
        const next = elements[index + 1]
        const wrapper = element.closest(".region-section-break")
        return {
          top: relTop(element),
          height: blockHeight(element),
          keepWithNext: element.matches(KEEP_WITH_NEXT) || Boolean(next?.matches(KEEP_WITH_PREVIOUS)),
          forceBreak: Boolean(wrapper && elements.find((candidate) => wrapper.contains(candidate)) === element),
        }
      })
      // Margins after a break are truncated, but nothing follows the last block:
      // its trailing margin (collapsed with its ancestors') must fit on the page too.
      blocks[blocks.length - 1].height += trailingMargin(elements[elements.length - 1], article) * zoom
      const pagination = paginate(blocks, pageLayout, design.targetPages)
      elements.forEach((element, index) => blockPages.set(element, pagination.blockPages[index] ?? 1))
      for (const { blockIndex, spacerPx } of pagination.breaks) {
        spacers.push({ host: spacerHost(elements[blockIndex], column), spacerPx, page: pagination.blockPages[blockIndex] ?? 1 })
      }
      for (const index of pagination.oversized) oversized.push(elements[index])
      pages = Math.max(pages, pagination.pageCount)
      overflowPx = Math.max(overflowPx, pagination.overflowPx)
    }
    const apply = (host: HTMLElement, spacerPx: number, page: number) => {
      const natural = parseFloat(getComputedStyle(host).paddingTop) || 0
      host.setAttribute("data-cv-page-start", String(page))
      // Spacers are applied in CSS pixels; measurements were in on-screen pixels.
      host.style.setProperty("--cv-spacer", `${spacerPx / zoom + natural}px`)
    }
    for (const { host, spacerPx, page } of spacers) apply(host, spacerPx, page)
    for (const element of oversized) element.setAttribute("data-cv-oversized", "")

    // The footer sits below the taller column, so it is placed once the columns are spaced.
    const footer = article.querySelector<HTMLElement>(".region-footer")
    if (footer) {
      const top = relTop(footer)
      const bottom = top + footer.getBoundingClientRect().height
      const page = Math.max(1, Math.floor((top - marginPx) / (sheetPx + gapPx)) + 1)
      const contentTop = (n: number) => marginPx + (n - 1) * (sheetPx + gapPx)
      // Its margin-top stays above the spacer, as print truncates it at the break.
      if (bottom > contentTop(page) + pageContentPx - HEADROOM_PX * zoom) {
        apply(footer, contentTop(page + 1) - top, page + 1)
        pages = Math.max(pages, page + 1)
        blockPages.set(footer, page + 1)
      } else {
        pages = Math.max(pages, page)
        blockPages.set(footer, page)
      }
    }

    if (process.env.NODE_ENV !== "production" && spacers[0]) {
      const { host, page } = spacers[0]
      const contentTop = relTop(host) + parseFloat(getComputedStyle(host).getPropertyValue("--cv-spacer")) * zoom
      const expected = marginPx + (page - 1) * (sheetPx + gapPx)
      if (Math.abs(contentTop - expected) > 1.5) console.warn(`[cv-paged-proof] page ${page} starts ${Math.round(contentTop - expected)}px off its sheet`)
    }

    blockPagesRef.current = blockPages
    pageCountRef.current = pages
    metricsRef.current = { overflowPx, linePx: fontPt * lineHeight * (96 / 72) * zoom, oversized: oversized.length, fontPt }
    setPageCount(pages)
    report()
  }, [paper.width, paper.height, marginMm, fontPt, lineHeight, design.targetPages, report])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    // Clear, measure and apply in one frame, so the flow never paints unspaced.
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    schedule()
    let width = root.getBoundingClientRect().width
    const resize = new ResizeObserver(() => {
      // Spacers change the height; only a width change can change the wrapping.
      const next = root.getBoundingClientRect().width
      if (Math.abs(next - width) > 0.5) { width = next; schedule() }
    })
    resize.observe(root)
    const mutations = new MutationObserver(schedule)
    // Spacers are style/attribute writes, so they never retrigger this.
    mutations.observe(root, { childList: true, subtree: true, characterData: true })
    void document.fonts?.ready.then(schedule)
    // A portrait changes the header height once it loads.
    root.addEventListener("load", schedule, true)
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect(); root.removeEventListener("load", schedule, true) }
    // Design changes (gaps, date alignment, sidebar width…) restyle the article without
    // touching its text, so they are dependencies rather than observed mutations.
  }, [measure, layout, designKey])

  useEffect(() => {
    const onSelection = () => {
      const anchor = window.getSelection()?.anchorNode ?? null
      let page: number | null = null
      if (anchor && rootRef.current?.contains(anchor)) {
        for (const [block, blockPage] of blockPagesRef.current) {
          if (block.contains(anchor)) { page = blockPage; break }
        }
      }
      if (page !== caretRef.current) { caretRef.current = page; report() }
    }
    document.addEventListener("selectionchange", onSelection)
    return () => document.removeEventListener("selectionchange", onSelection)
  }, [report])

  const sheets = Math.max(1, pageCount)
  const sheetTop = (index: number) => `calc(${index} * (${paper.height}mm + ${GAP_PX}px))`
  return (
    <div
      ref={rootRef}
      className="cv-paged-proof"
      data-cv-page-count={pageCount}
      style={{ width: `${paper.width}mm`, minHeight: `calc(${sheets} * ${paper.height}mm + ${(sheets - 1) * GAP_PX}px)` }}
    >
      <style>{pagedProofStyles}</style>
      {Array.from({ length: sheets }, (_, index) => (
        <div key={index} className="cv-paged-proof__sheet" aria-hidden="true" style={{ top: sheetTop(index), height: `${paper.height}mm` }} />
      ))}
      <RegionalCvLayout layout={layout} data={data} profilePicture={profilePicture} />
      {/* The document is one continuous box; these show the desk between its pages. */}
      {Array.from({ length: sheets - 1 }, (_, index) => (
        <div key={index} className="cv-paged-proof__gap" aria-hidden="true"
          style={{ top: `calc(${index + 1} * ${paper.height}mm + ${index * GAP_PX}px)`, height: `${GAP_PX}px` }} />
      ))}
      {Array.from({ length: sheets }, (_, index) => (
        <div key={index} className="cv-paged-proof__edge" aria-hidden="true" style={{ top: sheetTop(index), height: `${paper.height}mm` }} />
      ))}
    </div>
  )
}

/**
 * The copy that actually prints: the same layout and data with no editor
 * hooks or spacers. The browser pages it with the rules the proof models.
 */
export function CvPrintCopy({ layout, data, profilePicture }: { layout: CvLayoutId; data: CvData; profilePicture: StaticImageData }) {
  const design = cvDesignSchema.parse(data.design ?? {})
  return (
    <div className="cv-print-copy">
      {/* Margins live on the document (cloned onto every page), so full-bleed design reaches the paper edge. */}
      <style>{`@page { size: ${design.page}; margin: 0; } .cv-print-copy { display: none; } @media print { .cv-print-copy { display: block !important; } }`}</style>
      <RegionalCvLayout layout={layout} data={data} profilePicture={profilePicture} />
    </div>
  )
}

const pagedProofStyles = `
  .cv-paged-proof { position: relative; margin: 0 auto; }
  .cv-paged-proof__sheet { position: absolute; left: 0; right: 0; background: #fff; }
  .cv-paged-proof__gap { position: absolute; left: -40px; right: -40px; z-index: 3; background: var(--pf-board, #e9e6df); pointer-events: none; }
  .cv-paged-proof__edge { position: absolute; left: 0; right: 0; z-index: 4; pointer-events: none; box-shadow: 0 1px 3px rgba(0,0,0,.18), 0 6px 18px rgba(0,0,0,.08); }
  .cv-paged-proof > .regional-cv { position: relative; z-index: 1; box-shadow: none; }
  .cv-paged-proof [data-cv-page-start] { padding-top: var(--cv-spacer, 0px) !important; }
  .cv-paged-proof [data-cv-oversized] { outline: 1px dashed #b8321b; outline-offset: 2px; }
  /* Reordering and hiding live in the outline; the page shows only what prints. */
  .cv-paged-proof .cv-edit-controls { display: none !important; }
  /* Show what prints, not the on-screen link. */
  .cv-paged-proof .regional-cv .region-project-github { display: none; }
  .cv-paged-proof .regional-cv .region-project-github-print { display: inline; }
  .cv-paged-proof .cv-editable { border-radius: 2px; outline: none; }
  .cv-paged-proof .cv-editable:hover { background: rgba(184, 50, 27, .06); }
  .cv-paged-proof .cv-editable:focus { background: rgba(184, 50, 27, .08); box-shadow: 0 0 0 2px rgba(184, 50, 27, .55); }
  .cv-paged-proof .cv-editable:empty::before { content: attr(data-placeholder); color: #8a9199; }
  @media print { .cv-paged-proof { display: none !important; } }
`
