/**
 * Page breaks for the editor's print view, following the same rules the print
 * CSS declares: paragraphs and list items never split (`break-inside: avoid`),
 * headings stay with what follows (`break-after: avoid`), and margins at a break
 * are truncated, so a page starts at its first block's top edge.
 *
 * Pure: the caller measures the DOM (with spacers removed) and applies spacers.
 */

/** Pixels, relative to the content column top, with no page spacers applied. */
export interface MeasuredBlock {
  top: number
  height: number
  keepWithNext: boolean
  /** `break-before: page`: always starts a new page unless it already starts one. */
  forceBreak?: boolean
}

export interface PageLayout {
  /** Printable height of one page (paper height minus top and bottom margins). */
  pageContentPx: number
  marginPx: number
  /** Visible gap between two sheets on screen. */
  gapPx: number
  /** Top of page 1's content area; defaults to the first block's top. */
  originPx?: number
  /** Break a little early, so sub-pixel rounding in print never pushes a block over. */
  headroomPx?: number
}

export interface Pagination {
  pageCount: number
  /** Blocks that start a new page, and the padding that pushes each onto its sheet. */
  breaks: { blockIndex: number; spacerPx: number }[]
  /** Blocks taller than a page: they split in print and get a warning on screen. */
  oversized: number[]
  /** Content height on pages beyond `targetPages` (0 without a target). */
  overflowPx: number
  /** 1-based page of each block. */
  blockPages: number[]
}

export function paginate(blocks: readonly MeasuredBlock[], layout: PageLayout, targetPages?: number): Pagination {
  const { pageContentPx, marginPx, gapPx, headroomPx = 0 } = layout
  const breaks: Pagination["breaks"] = []
  const oversized: number[] = []
  const blockPages: number[] = []
  // Content extent of each page: start offset and bottom of its last block.
  const pages: { start: number; bottom: number }[] = []
  let page = 1
  let pageStart = layout.originPx ?? blocks[0]?.top ?? 0
  let pageFirst = 0

  const startPage = (index: number) => {
    const previousBottom = pageStart + pageContentPx
    breaks.push({ blockIndex: index, spacerPx: previousBottom - blocks[index].top + 2 * marginPx + gapPx })
    page += 1
    pageStart = blocks[index].top
    pageFirst = index
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const current = blocks[index]
    // A forced break already "happens" when the block opens the page's content.
    if (current.forceBreak && current.top > pageStart + 0.5) {
      pages[page - 1] = { start: pages[page - 1]?.start ?? pageStart, bottom: index > 0 ? blocks[index - 1].top + blocks[index - 1].height : pageStart }
      startPage(index)
    } else if (current.top + current.height - pageStart > pageContentPx - headroomPx && (index > pageFirst || current.top > pageStart + 0.5)) {
      // Pull back headings that must stay with this block, but never past the
      // block that opens the page (it would land on the next page just the same).
      const opensPage = (at: number) => at === pageFirst && blocks[at].top <= pageStart + 0.5
      let breakAt = index
      while (breakAt - 1 >= pageFirst && !opensPage(breakAt - 1) && blocks[breakAt - 1].keepWithNext) breakAt -= 1
      for (let moved = breakAt; moved < index; moved += 1) blockPages[moved] = page + 1
      // The page being closed now ends at the block before the pulled-back headings.
      const last = blocks[breakAt - 1]
      pages[page - 1] = { start: pageStart, bottom: last ? last.top + last.height : pageStart }
      startPage(breakAt)
    }
    blockPages[index] = page
    if (current.height > pageContentPx) {
      oversized.push(index)
      // It fills whole pages in print; whatever follows flows onto its last one.
      const extra = Math.ceil(current.height / pageContentPx) - 1
      for (let fill = 0; fill < extra; fill += 1) {
        pages[page - 1] = { start: pageStart, bottom: pageStart + pageContentPx }
        page += 1
        pageStart += pageContentPx
      }
    }
    pages[page - 1] = { start: pages[page - 1]?.start ?? pageStart, bottom: current.top + current.height }
  }

  const pageCount = Math.max(1, page)
  const overflowPx = targetPages
    ? pages.slice(targetPages).reduce((sum, extent) => sum + (extent ? extent.bottom - extent.start : 0), 0)
    : 0
  return { pageCount, breaks, oversized, overflowPx, blockPages }
}

export function pageOfBlock(pagination: Pagination, blockIndex: number): number {
  return pagination.blockPages[blockIndex] ?? 1
}

/** Pixels per millimetre from the measured content column, so zoom never matters. */
export function pxPerMm(columnWidthPx: number, columnWidthMm: number): number {
  return columnWidthMm > 0 ? columnWidthPx / columnWidthMm : 0
}
