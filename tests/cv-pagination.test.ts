import { describe, expect, it } from "vitest"

import { pageOfBlock, paginate, pxPerMm, type MeasuredBlock } from "@/lib/cv-pagination"

const layout = { pageContentPx: 100, marginPx: 10, gapPx: 12 }
const block = (top: number, height: number, keepWithNext = false): MeasuredBlock => ({ top, height, keepWithNext })

describe("paginate", () => {
  it("breaks before the block that does not fit and sizes the spacer", () => {
    const result = paginate([block(0, 40), block(45, 40), block(90, 40)], layout)
    expect(result.pageCount).toBe(2)
    expect(result.breaks).toEqual([{ blockIndex: 2, spacerPx: (0 + 100 - 90) + 20 + 12 }])
  })
  it("lets a block that ends exactly at the page bottom fit", () => {
    expect(paginate([block(0, 50), block(50, 50)], layout).pageCount).toBe(1)
  })
  it("keeps a heading with the block after it", () => {
    const result = paginate([block(0, 70), block(80, 10, true), block(92, 20)], layout)
    expect(result.breaks.map((b) => b.blockIndex)).toEqual([1])
  })
  it("never pushes a page's first block even when it keeps with next", () => {
    const result = paginate([block(0, 10, true), block(10, 120)], layout)
    expect(result.breaks.map((b) => b.blockIndex)).toEqual([1])
  })
  it("counts a block taller than a page as the pages it fills in print", () => {
    const result = paginate([block(0, 30), block(35, 250), block(290, 10)], layout)
    expect(result.oversized).toEqual([1])
    expect(result.breaks.map((b) => b.blockIndex)).toEqual([1])
    // Page 1, then 250px over three pages; the last block flows onto the last of them.
    expect(result.pageCount).toBe(4)
    expect(pageOfBlock(result, 2)).toBe(4)
  })
  it("measures overflow beyond the target page count", () => {
    const result = paginate([block(0, 80), block(85, 40)], layout, 1)
    expect(result.pageCount).toBe(2)
    expect(result.overflowPx).toBe(40)
    expect(paginate([block(0, 80)], layout, 1).overflowPx).toBe(0)
    expect(paginate([block(0, 80), block(85, 40)], layout).overflowPx).toBe(0)
  })
  it("treats an empty document as one page", () => {
    expect(paginate([], layout)).toEqual({ pageCount: 1, breaks: [], oversized: [], overflowPx: 0, blockPages: [] })
  })
})

describe("page helpers", () => {
  it("finds the page of a block", () => {
    const result = paginate([block(0, 40), block(45, 40), block(90, 40)], layout)
    expect([0, 1, 2].map((i) => pageOfBlock(result, i))).toEqual([1, 1, 2])
  })
  it("derives pixels per mm from the measured column, independent of zoom", () => {
    expect(pxPerMm(793.7, 210)).toBeCloseTo(3.7795, 3)
    expect(pxPerMm(396.85, 210)).toBeCloseTo(1.8898, 3)
  })
})

describe("overflow with pulled-back headings", () => {
  it("counts the heading on the page it moved to", () => {
    const result = paginate([block(0, 70), block(80, 10, true), block(92, 20)], layout, 1)
    expect(result.blockPages).toEqual([1, 2, 2])
    expect(result.overflowPx).toBe(92 + 20 - 80)
  })
})

describe("columns that start below the page top", () => {
  it("measures page 1 from the origin, so the first block can move", () => {
    const result = paginate([block(60, 30), block(92, 30)], { ...layout, originPx: 10 })
    // 92 + 30 - 10 = 112 > 100: the second block opens page 2.
    expect(result.breaks).toEqual([{ blockIndex: 1, spacerPx: (10 + 100 - 92) + 20 + 12 }])
  })
  it("pulls a heading back even when it is the column's first block", () => {
    const result = paginate([block(80, 10, true), block(92, 20)], { ...layout, originPx: 10 })
    expect(result.breaks.map((b) => b.blockIndex)).toEqual([0])
    expect(result.blockPages).toEqual([2, 2])
  })
  it("honours forced breaks and breaks early by the headroom", () => {
    const forced = paginate([block(0, 10), { ...block(12, 10), forceBreak: true }], layout)
    expect(forced.breaks.map((b) => b.blockIndex)).toEqual([1])
    expect(paginate([block(0, 50), block(50, 49.5)], { ...layout, headroomPx: 1 }).pageCount).toBe(2)
  })
})
